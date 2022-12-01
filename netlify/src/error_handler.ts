import * as Sentry from "@sentry/node";
import "@sentry/tracing";


let errorHandler = (error: any) => {
    console.log(process.env.NODE_ENV)
    console.error(error)
}

if (process.env.NODE_ENV && ['prod', 'production'].includes(process.env.NODE_ENV)) {
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
