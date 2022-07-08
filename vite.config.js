import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import {ElementPlusResolver} from 'unplugin-vue-components/resolvers'
import ElementPlus from 'unplugin-element-plus/vite'

// https://github.com/element-plus/element-plus-vite-starter
// https://vitejs.dev/config/
// https://github.com/antfu/unplugin-auto-import

export default defineConfig({
    server: {
        proxy: {
            '^/atomfast': {
                target: 'http://localhost:9999/.netlify/functions'
            },
            '^/spectrum': {
                target: 'http://localhost:9999/.netlify/functions'
            },
            '^/session': {
                target: 'http://localhost:9999/.netlify/functions'
            },
            '^/logout': {
                target: 'http://localhost:9999/.netlify/functions'
            },
            '^/point': {
                target: 'http://localhost:9999/.netlify/functions'
            },
            '^/radiacode': {
                target: 'http://localhost:9999/.netlify/functions'
            }
        },
    },
    plugins: [
        vue(),
        AutoImport({
            resolvers: [ElementPlusResolver()],
        }),
        Components({
            resolvers: [ElementPlusResolver()],
        }),
        ElementPlus({}),
    ]
})
