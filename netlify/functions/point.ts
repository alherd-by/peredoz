import {Handler, HandlerResponse} from "@netlify/functions";
import {JSONResponse} from "../src/json_response";
import AWS from 'aws-sdk';
import {v4 as uuidv4} from 'uuid';
import {supabase, getToken} from "../src/supabase";

const s3 = new AWS.S3({
    region: process.env.AWS_S3_REGION,
    accessKeyId: process.env.AWS_S3_ACCESS_KEY,
    secretAccessKey: process.env.AWS_S3_SECRET_KEY,
})

const handler: Handler = async (event): Promise<HandlerResponse> => {
    let raw;
    try {
        raw = JSON.parse(event.body);
    } catch {
        return JSONResponse(
            {error: 'Невалидное тело запроса'},
            {
                statusCode: 400,
            }
        )
    }
    const token = getToken(event.headers);
    supabase.auth.setAuth(token)
    const response = await supabase.auth.api.getUser(token)
    if (response.error) {
        console.error(response.error)
        return JSONResponse(
            {error: 'Произошла ошибка авторизации'},
            {
                statusCode: 401,
            }
        )
    }
    if (!raw.location) {
        return JSONResponse(
            {error: 'Нет координат'},
            {
                statusCode: 400,
            }
        )
    }
    const attachments: any[] = [];
    if (raw.attachment && Array.isArray(raw.attachment)) {
        for (let attachment of raw.attachment) {
            try {
                const format = attachment.substring(attachment.indexOf('data:') + 5, attachment.indexOf(';base64'));
                let buf = Buffer.from(attachment.replace(/^data:.+;base64,/, ""), 'base64')
                const fileName = uuidv4();
                if (buf.byteLength > 10 * 1000 * 1000) {
                    return JSONResponse(
                        {error: 'Файл слишком большой по размеру'},
                        {
                            statusCode: 400,
                        }
                    )
                }
                await s3.putObject(
                    {
                        Bucket: process.env.S3_BUCKET,
                        Key: fileName,
                        Tagging: 'type=point',
                        Body: buf,
                        ContentType: format,
                        ACL: 'public-read',
                    }
                ).promise()
                attachments.push({
                    mime: format,
                    size: buf.byteLength,
                    url: `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_S3_REGION}.amazonaws.com/${fileName}`
                })
            } catch (e) {
                console.log(e);
                return JSONResponse(
                    {error: 'Произошла ошибка при загрузке файла в хранилище'},
                    {
                        statusCode: 500,
                    }
                )
            }
        }
    }
    const geometry = {
        type: 'Point',
        coordinates: raw.location
    }
    let result
    result = await supabase.from('point').insert([{
        properties: {
            comment: raw.comment,
            attachments
        },
        geometry,
        user_id: response.user.id
    }]).single()

    if (result.error) {
        console.error(result.error)
        return JSONResponse(
            {error: 'Произошла ошибка при добавлении данных'},
            {
                statusCode: 500,
            }
        )
    }
    return JSONResponse(result)
}

export {handler}
