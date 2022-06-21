import {Handler, HandlerResponse} from "@netlify/functions";
import {JSONResponse} from "../src/json_response";


const handler: Handler = async (event): Promise<HandlerResponse> => {
    try {
        const d = new Date(0)
        return {
            statusCode: 200,
            body: JSON.stringify({'success': true, user: {email: ''}}),
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
            },
            multiValueHeaders: {
                'Set-Cookie': [
                    `AUTH=1; Expires=${d.toUTCString()};Domain=${process.env.DOMAIN};Path=/; Secure; HttpOnly; SameSite=Strict`,
                    `USER=1; Expires=${d.toUTCString()};Domain=${process.env.DOMAIN};Path=/; Secure; SameSite=Strict`,
                ]
            }
        }
    } catch (e) {
        console.error(e)
        return JSONResponse(
            {error: 'something went wrong'},
            {
                statusCode: 500,
            }
        )
    }
}


export {handler}
