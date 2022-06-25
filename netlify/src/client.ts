import {createClient, defaultExchanges, gql, OperationResult} from '@urql/core';
import fetch from 'node-fetch';

(<any>globalThis).fetch = fetch

const client = createClient({
    url: process.env.API_URL,
    exchanges: defaultExchanges,
});

interface CookieHash {
    [name: string]: string;
}

const parseCookies = (raw: string): CookieHash => {
    if (!raw) {
        return {};
    }
    const parts = raw.split(';')
    let result: CookieHash = {};
    for (let part of parts) {
        let [key, value] = part.split('=')
        result[(<any>key.trim())] = value;
    }
    return result
}

const mutation = async (query: string, variables: any, token?: any): Promise<OperationResult> => {
    return client.mutation(
        gql(query),
        variables,
        {
            fetchOptions: {
                headers: {
                    'Cookie': 'AUTH=' + token
                }
            }
        }
    ).toPromise();
}

export {mutation, parseCookies}
