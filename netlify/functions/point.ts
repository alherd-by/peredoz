import {Handler, HandlerResponse} from "@netlify/functions";
import {JSONResponse} from "../src/json_response";
import {mutation, parseCookies} from "../src/client";
import {initializeApp, cert} from "firebase-admin/app";
import AWS from 'aws-sdk';
import {getAuth} from "firebase-admin/auth";
import {v4 as uuidv4} from 'uuid';

const app = initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_CREDENTIALS))
})
const auth = getAuth(app);

const s3 = new AWS.S3({
    region: process.env.AWS_S3_REGION,
    accessKeyId: process.env.AWS_S3_ACCESS_KEY,
    secretAccessKey: process.env.AWS_S3_SECRET_KEY,
})

const handler: Handler = async (event): Promise<HandlerResponse> => {
    const raw = JSON.parse(event.body);
    const cookies = parseCookies(<string | undefined>event.headers.cookie)
    if (!cookies['AUTH']) {
        return JSONResponse(
            {error: 'not_auth'},
            {
                statusCode: 401,
            }
        )
    }
    try {
        await auth.verifySessionCookie(cookies.AUTH);
    } catch (e) {
        console.error(e)
        return JSONResponse(
            {error: 'not_auth_error'},
            {
                statusCode: 401,
            }
        )
    }
    if (!raw.location) {
        return JSONResponse(
            {error: 'not_found_location'},
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
                    {error: 'Произошла ошибка при загрузке файла'},
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
    // language=GraphQL
    const result = await mutation(`mutation ($object: track_point_insert_input!) {
        point: insert_track_point_one(object: $object) {
            id
            geometry
            properties
        }
    }`,
        {
            object: {
                properties: {
                    comment: raw.comment,
                    attachments
                },
                geometry
            }
        },
        cookies.AUTH
    )
    return JSONResponse(result)
}

export {handler}
