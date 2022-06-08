import {mutation} from './client'

interface PreTrack {
    id: number,
    points: Array<{ lat: number, lng: number }>
}

const insertTrack = async (raw: PreTrack): Promise<{ data?: object, error?: string }> => {
    const result = await mutation(`mutation ($object: track_insert_input!) {
track: insert_track_one(object: $object) {
    id
    name
    track_points_aggregate {
       aggregate {
            count       
       }
    }
}
}`,
        {
            object: {
                name: raw.id + '',
                atomfast_id: raw.id,
                track_points: {
                    data: raw.points.map((item) => ({
                        properties: item,
                        geometry: {
                            type: 'Point',
                            coordinates: [item.lng, item.lat]
                        }
                    }))
                }
            }
        }
    )
    if (result.error) {
        if (/\[GraphQL] Uniqueness violation./.test(result.error.message)) {
            return {error: 'Такой трек уже был загружен с atomfast'}
        }
        throw result.error;
    }
    return {data: result.data};
}

export {insertTrack}
