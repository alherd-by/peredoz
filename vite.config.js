import {defineConfig}        from 'vite'
import vue                   from '@vitejs/plugin-vue'
import AutoImport            from 'unplugin-auto-import/vite'
import Components            from 'unplugin-vue-components/vite'
import {ElementPlusResolver} from 'unplugin-vue-components/resolvers'
import ElementPlus           from 'unplugin-element-plus/vite'

// https://github.com/element-plus/element-plus-vite-starter
// https://vitejs.dev/config/
export default defineConfig({
    server : {
        proxy: {
            '^/atomfast': {
                target: 'http://localhost:9999/.netlify/functions'
            },
            '^/point'   : {
                target: 'http://localhost:9999/.netlify/functions'
            },
            '/api'      : {
                target      : process.env.REAL_SUPABASE_URL || 'http://localhost:54321',
                changeOrigin: true,
                rewrite     : (path) => path.replace(/^\/api/, '')
            },
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
