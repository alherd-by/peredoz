import {Handler, HandlerResponse} from "@netlify/functions";
import {JSONResponse} from "../src/json_response";
import {mutation, parseCookies} from "../src/client";
import {initializeApp, cert} from "firebase-admin/app";
import {getAuth} from "firebase-admin/auth";

const app = initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_CREDENTIALS))
})
const auth = getAuth(app);

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
                    comment: raw.comment
                },
                geometry
            }
        },
        cookies.AUTH
    )
    return JSONResponse(result)
}

export {handler}
