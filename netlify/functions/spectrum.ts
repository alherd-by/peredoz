import {Handler, HandlerResponse} from "@netlify/functions";
import {JSONResponse} from "../src/json_response";

const handler: Handler = async (event): Promise<HandlerResponse> => {
    const raw = JSON.parse(event.body);
    let input = Buffer.from(raw['file'].split(',')[1], 'base64').toString();
    return JSONResponse({})
}


export {handler}
