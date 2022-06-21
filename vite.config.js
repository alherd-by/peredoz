import path from 'path'
import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'

import Components from 'unplugin-vue-components/vite'
import {ElementPlusResolver} from 'unplugin-vue-components/resolvers'

const pathSrc = path.resolve(__dirname, 'src')

//https://github.com/element-plus/element-plus-vite-starter
// https://vitejs.dev/config/

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
            }
        },
    },
    resolve: {
        alias: {
            '~/': `${pathSrc}/`,
        },
    },
    // css: {
    //     preprocessorOptions: {
    //         scss: {
    //             additionalData: `@use "~/styles/element/index.scss" as *;`,
    //         },
    //     },
    // },
    plugins: [
        vue(),
        Components({
            // allow auto load markdown components under `./src/components/`
            extensions: ['vue', 'md'],
            // allow auto import and register components used in markdown
            include: [/\.vue$/, /\.vue\?vue/, /\.md$/],
            resolvers: [
                ElementPlusResolver({
                    importStyle: 'sass',
                }),
            ],
            dts: 'src/components.d.ts',
        }),
    ],
})
