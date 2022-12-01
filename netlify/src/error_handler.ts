import * as Sentry from "@sentry/node";
import "@sentry/tracing";


let errorHandler = (error: any) => {
    console.error(error)
}

if (process.env.NODE_ENV && process.env.NODE_ENV === 'prod') {
    Sentry.init({
        dsn: "https://examplePublicKey@o0.ingest.sentry.io/0",
        tracesSampleRate: 1.0,
    });
    errorHandler = (error: any) => {
        const transaction = Sentry.startTransaction({
            name: "error",
        });
        Sentry.captureException(error);
        transaction.finish();
    }
}
export {errorHandler}
