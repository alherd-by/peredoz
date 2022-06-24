import {createClient, defaultExchanges, gql, OperationResult} from '@urql/core';
import fetch from 'node-fetch';

(<any>globalThis).fetch = fetch

const client = createClient({
    url: process.env.API_URL,
    exchanges: defaultExchanges,
});

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

export {mutation}
