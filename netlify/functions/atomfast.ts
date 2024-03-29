import {Handler, HandlerResponse} from "@netlify/functions";
import fetch from 'node-fetch'
import {JSONResponse} from "../src/json_response";
import {supabaseCreate, getToken} from '../src/supabase'
import {errorHandler} from "../src/error_handler";

const errorAuth = 'Ошибка авторизации';

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

    const token = getToken(event.headers);
    const supabase = await supabaseCreate(token);
    const response = await supabase.auth.getUser(token)
    if (response.error) {
        return JSONResponse(
            {error: errorAuth},
            {
                statusCode: 401,
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
    let points: any;
    try {
        const response = await fetch('http://www.atomfast.net/maps/markers/' + trackNumber);
        points = await response.json()
    } catch (e) {
        errorHandler(e)
        return {
            statusCode: 500,
            body: JSON.stringify({'error': 'Произошла ошибка при загрузке трека с atomfast'}),
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
            },
        }
    }

    let result: any;
    try {
        let object = {
            name: name,
            atomfast_id: trackNumber,
            user_id: response.data.user.id,
            first_point: {
                type: 'Point',
                coordinates: [points[0].lng, points[1].lat]
            },
        }
        result = await supabase.from('track').insert([object]).select().single()
        if (result.error) {
            if (result.error.message === 'duplicate key value violates unique constraint "track_atomfast_id_uindex"') {
                return {
                    statusCode: 200,
                    body: JSON.stringify({'error': 'Такой трек уже был загружен с atomfast'}),
                    headers: {
                        'Content-Type': 'application/json;charset=UTF-8',
                    },
                }
            }
            errorHandler(result.error)
            return JSONResponse(
                {error: 'Произошла ошибка', data: result.error},
                {
                    statusCode: 500,
                }
            )
        }
        points = points.map((item: any) => ({
            properties: item,
            geometry: {
                type: 'Point',
                coordinates: [item.lng, item.lat]
            },
            user_id: response.data.user.id,
            track_id: result.data.id
        }))
        result = await supabase.from('point').insert(points)
        if (result.error) {
            errorHandler(result.error)
            return JSONResponse(
                {error: 'Произошла ошибка', data: result.error},
                {
                    statusCode: 500,
                }
            )
        }
        return JSONResponse(result)
    } catch (e) {
        errorHandler(e)
        return JSONResponse(
            {error: 'Произошла ошибка'},
            {
                statusCode: 500,
            }
        )
    }

}


export {handler}
