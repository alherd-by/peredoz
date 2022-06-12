import {Handler, HandlerResponse} from "@netlify/functions";
import {JSONResponse} from "../src/json_response";
import {mutation} from "../src/client";

const handler: Handler = async (event): Promise<HandlerResponse> => {
    const raw = JSON.parse(event.body);
    // language=GraphQL
    const result = await mutation(`mutation ($object: spectrum_insert_input!) {
        spectrum: insert_spectrum_one(object: $object) {
            id
            name
            track_point_id
            data
        }
    }`,
        {
            object: {
                name: raw.spectrum.ResultDataList.ResultData.BackgroundSpectrumFile,
                data: raw.spectrum,
                track_point_id: raw.track_point_id,
            }
        }
    )
    return JSONResponse(result)
}

export {handler}
