import {createApp} from 'vue'
import App from './App.vue'
import './assets/main.css'
import * as Sentry from "@sentry/vue";
import {BrowserTracing} from "@sentry/tracing"; // ES 2015

const app    = createApp(App);
app.mount('#app')

if (import.meta.env.MODE !== 'development') {
    Sentry.init({
        app,
        dsn: "https://bfbbd64dd6ba4527a3606390d6cd4b99@o30424.ingest.sentry.io/6607386",
        integrations: [
            new BrowserTracing({
                tracingOrigins: ["localhost", "peredoz.netlify.app", /^\//],
            }),
        ],
        tracesSampleRate: 1.0,
    });
}
