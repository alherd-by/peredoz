import {mutation} from './client'

interface Track {
    id?: number,
    name: string
    extra?: {
        original_name?: string
    }
    atomfast_id?: number
    points: {
        data: Array<{
            geometry: {
                type: 'Point',
                coordinates: Array<number>
            },
            properties: {
                [key: string]: any
            }
        }>
    },
}

const insertTrack = async (object: Track, token: string): Promise<{ data?: object, error?: string }> => {
    // language=GraphQL
    const result = await mutation(`mutation ($object: track_insert_input!) {
track: insert_track_one(object: $object) {
    id
    name
    points_aggregate {
       aggregate {
            count       
       }
    }
}
}`,
        {
            object
        },
        token
    )
    if (result.error) {
        if (/\[GraphQL] Uniqueness violation./.test(result.error.message) && /unique_atomfast_id/.test(result.error.message)) {
            console.error(result.error)
            return {error: 'Такой трек уже был загружен с Atomfast'}
        }
        throw result.error;
    }
    return {data: result.data};
}

export {insertTrack, Track}
