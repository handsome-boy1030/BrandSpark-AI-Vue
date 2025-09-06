import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
import {fileURLToPath, URL} from 'url';
import vuetify from 'vite-plugin-vuetify' // 引入插件

export default defineConfig({
    define: {
        global: 'window'
    },
    plugins: [
        vue(),
        vuetify({autoImport:true}),
    ],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url))
        }
    },
    server: {
        port: 19999,
        host: '0.0.0.0'
    },

});