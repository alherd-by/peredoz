import {Handler, HandlerResponse} from "@netlify/functions";
import {JSONResponse} from "../src/json_response";
import {initializeApp, cert} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";

const app = initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_CREDENTIALS))
})
const auth = getAuth(app);
const expiresIn = 5 * 24 * 60 * 60 * 1000;

const handler: Handler = async (event): Promise<HandlerResponse> => {
    let input: any;
    try {
        input = JSON.parse(event.body + '');
    } catch (e) {
        console.error(e)
        return JSONResponse(
            {error: 'invalid_body'},
            {
                statusCode: 400,
            }
        )
    }
    try {
        const sessionCookie = await auth.createSessionCookie(input.token, {expiresIn})

        let d = new Date((new Date()).getTime() + expiresIn);
        const decoded = await auth.verifySessionCookie(sessionCookie);
        const user = {email: decoded['email']};
        return {
            statusCode: 200,
            body: JSON.stringify({'success': true, user}),
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
            },
            multiValueHeaders: {
                'Set-Cookie': [
                    `AUTH=${sessionCookie}; Expires=${d.toUTCString()};Domain=${process.env.DOMAIN};Path=/; Secure; HttpOnly; SameSite=Strict`,
                    `USER=${JSON.stringify(user)}; Expires=${d.toUTCString()};Domain=${process.env.DOMAIN};Path=/; Secure; SameSite=Strict`,
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
