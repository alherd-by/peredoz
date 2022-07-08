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
        geometry: {
            type: "Point",
            coordinates: raw.location
        },
        properties: {
            name: raw.name
        },
    }
    if (raw.point_id) {
        input.id = raw.point_id
    } else {
        if (!raw.location) {
            return JSONResponse(
                {error: 'Укажите местоположение'},
                {
                    statusCode: 400,
                }
            )
        }
        input.spectrum = {
            data: {
                name: raw.spectrum.ResultDataList.ResultData.BackgroundSpectrumFile,
                data: raw.spectrum
            }
        }
    }
    // language=GraphQL
    const result = await mutation(`mutation ($input: point_insert_input!) {
        point: insert_point_one(
            object: $input,
            on_conflict: {
                constraint: point_pk,
                update_columns: [spectrum_id]
            }
        ) {
            id
            spectrum {
                id
                data
                name
                point_id
            }
            geometry
            properties
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
