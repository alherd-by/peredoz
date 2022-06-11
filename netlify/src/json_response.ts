import {HandlerResponse} from "@netlify/functions";

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

export {JSONResponse}
