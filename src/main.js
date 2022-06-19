import {createApp} from 'vue'
import App from './App.vue'
import 'element-plus/dist/index.css'
import urql from '@urql/vue';
import {createClient} from '@urql/core';
import './assets/main.css'

const client = createClient({
    url: (import.meta.env.VITE_API_BASE_URL + '/v1/graphql'),
    fetchOptions: {
        credentials: 'include'
    }
});
const app    = createApp(App);
app.use(urql, client);
app.mount('#app')
