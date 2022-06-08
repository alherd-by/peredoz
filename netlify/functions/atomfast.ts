import {Handler, HandlerResponse} from "@netlify/functions";
import fetch from 'node-fetch'
import {insertTrack} from "../src/tracks";

interface HeaderBag {
    [name: string]: string | string [] | undefined
}

const JSONResponse = (body: object, options?: object, headers?: HeaderBag): HandlerResponse => {
    let tmp: any = {
        body: JSON.stringify(body),
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json;charset=UTF-8',
        },
        multiValueHeaders: {},
        ...options
    }
    for (let key in headers) {
        if (Array.isArray(headers[key])) {
            tmp.multiValueHeaders[key] = headers[key]
        } else {
            tmp.headers[key] = headers[key]
        }
    }

    return tmp
}

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
    const response = await fetch('http://www.atomfast.net/maps/markers/' + trackNumber);
    const points: any = await response.json()

    let result: { data?: object, error?: string, points?: any };
    try {
        result = await insertTrack({
            id: trackNumber,
            points: points
        })
        result['points'] = points;
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
