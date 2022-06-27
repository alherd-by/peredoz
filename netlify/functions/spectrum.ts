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
    const input: any = {
        name: raw.spectrum.ResultDataList.ResultData.BackgroundSpectrumFile,
        data: raw.spectrum
    }
    if (raw.track_point_id) {
        input.track_point_id = raw.track_point_id
    } else {
        if (!raw.location) {
            return JSONResponse(
                {error: 'Укажите местоположение'},
                {
                    statusCode: 400,
                }
            )
        }
        input.point = {
            data: {
                geometry: {
                    type: "Point",
                    coordinates: raw.location
                },
                properties: {
                    name: raw.name
                }
            }
        }
    }
    // language=GraphQL
    const result = await mutation(`mutation ($input: spectrum_insert_input!) {
        spectrum: insert_spectrum_one(object: $input) {
            id
            name
            point {
                id
                geometry
                properties
            }
            data
        }
    }`,
        {
            input
        },
        cookies.AUTH
    )
    return JSONResponse(result)
}

export {handler}
