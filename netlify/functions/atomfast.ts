import {Handler, HandlerResponse} from "@netlify/functions";
import fetch from 'node-fetch'
import {insertTrack} from "../src/tracks";
import {JSONResponse} from "../src/json_response";
import {initializeApp, cert} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";
import {parseCookies} from "../src/client";

const app = initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_CREDENTIALS))
})
const auth = getAuth(app);

const handler: Handler = async (event): Promise<HandlerResponse> => {
    let input: any;
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
    if (!input['url']) {
        return JSONResponse(
            {error: 'not_found_url'},
            {
                statusCode: 400,
            }
        )
    }
    let chunks = /\/(\d+)/.exec(input['url']);
    if (chunks === null) {
        return JSONResponse(
            {error: 'not_found_url'},
            {
                statusCode: 400,
            }
        )
    }
    const trackNumber = parseInt(chunks[1])
    if (isNaN(trackNumber)) {
        return JSONResponse(
            {error: 'invalid_url'},
            {
                statusCode: 400,
            }
        )
    }

    const cookies = parseCookies(<string | undefined>event.headers.cookie)
    if (!cookies['AUTH']) {
        return JSONResponse(
            {error: 'not_auth'},
            {
                statusCode: 401,
            }
        )
    }
    let decoded;
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
    let points: any;
    try {
        const response = await fetch('http://www.atomfast.net/maps/markers/' + trackNumber);
        points = await response.json()
    } catch (e) {
        console.error(e)
        return {
            statusCode: 500,
            body: JSON.stringify({'error': 'Произошла ошибка при загрузке трека с atomfast'}),
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
            },
        }
    }

    let result: { data?: object, error?: string, points?: any };
    try {
        result = await insertTrack(
            {
                id: trackNumber,
                points: points,
                name,
            },
            cookies['AUTH']
        )
        result['points'] = trackNumber;
    } catch (e) {
        console.error(e);
        result = {error: 'Произошла ошибка'}
    }
    console.log(result)
    return {
        statusCode: 200,
        body: JSON.stringify(result),
        headers: {
            'Content-Type': 'application/json;charset=UTF-8',
        },
    }
}


export {handler}
