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
    const cookies = parseCookies(<string | undefined>event.headers.cookie)
    if (!cookies.AUTH) {
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
    let raw;
    try {
        raw = JSON.parse(event.body);
    } catch (e) {
        return JSONResponse(
            {error: 'invalid_body'},
            {
                statusCode: 400,
            }
        )
    }
    if (!raw.spectrum.ResultDataList) {
        return JSONResponse(
            {error: 'incorrect_format'},
            {
                statusCode: 400,
            }
        )
    }
    if (!raw.location && !raw.point_id) {
        return JSONResponse(
            {error: 'Укажите местоположение'},
            {
                statusCode: 400,
            }
        )
    }
    const input: any = {
        name: raw.name,
        data: raw.spectrum
    }
    if (raw.point_id) {
        input.point = {
            id: raw.point_id,
            geometry: {
                type: "Point",
                coordinates: [0, 0]
            },
            properties: {}
        }
    } else {
        input.point = {
            geometry: {
                type: "Point",
                coordinates: raw.location
            },
            properties: {}
        }
    }
    // language=GraphQL
    const result = await mutation(`mutation ($point: point_insert_input!, $name: String!, $data: jsonb) {
        insert_spectrum_one(
            object: {
                data: $data,
                name: $name
                points: {
                    data: [$point],
                    on_conflict: {
                        update_columns: [spectrum_id],
                        constraint: point_pk
                    }
                }
            }
        ) {
            id
        }
    }`,
        input,
        cookies.AUTH
    )
    return JSONResponse(result)
}

export {handler}
