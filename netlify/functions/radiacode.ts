import {Handler, HandlerResponse} from "@netlify/functions";
import {insertTrack} from "../src/tracks";
import {JSONResponse} from "../src/json_response";
import {initializeApp, cert} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {parseCookies} from "../src/client";
import {parse} from "../src/radiacode";

const app = initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_CREDENTIALS))
})
const auth = getAuth(app);

const handler: Handler = async (event): Promise<HandlerResponse> => {
    let input: any;
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
        await auth.verifySessionCookie(cookies['AUTH']);
    } catch (e) {
        console.error(e)
        return JSONResponse(
            {error: 'not_auth_error'},
            {
                statusCode: 401,
            }
        )
    }
    try {
        input = JSON.parse(event.body + '');
    } catch {
        return JSONResponse(
            {error: 'invalid_body'},
            {
                statusCode: 400,
            }
        )
    }
    const name = input['name'];
    if (!name) {
        return JSONResponse(
            {error: 'not_found_name'},
            {
                statusCode: 400,
            }
        )
    }
    const rawTrack: string = input['track'];
    if (!rawTrack) {
        return JSONResponse(
            {error: 'not_found_file'},
            {
                statusCode: 400,
            }
        )
    }
    let result: { data?: object, error?: string, points?: any };
    let raw;
    try {
        raw = parse(rawTrack);
    } catch (e) {
        console.error();
        result = {error: e + ''}
        return JSONResponse(result, {
            statusCode: 400,
        })
    }
    try {
        result = await insertTrack(
            {
                name,
                extra: {
                    original_name: raw.track_name
                },
                points: {
                    data: raw.points
                }
            },
            cookies['AUTH']
        )
    } catch (e) {
        console.error(e);
        result = {error: 'Произошла ошибка'}
    }
    return {
        statusCode: 200,
        body: JSON.stringify(result),
        headers: {
            'Content-Type': 'application/json;charset=UTF-8',
        },
    }
}


export {handler}
