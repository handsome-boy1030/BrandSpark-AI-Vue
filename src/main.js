import {createApp} from 'vue';
import './styles/main.scss';
import App from './App.vue';
import router from './router.js';
import { createPinia } from 'pinia' // 导入createPinia
import piniaPluginPersistence from 'pinia-plugin-persistedstate' // 导入持久化插件
import vuetify from "@/plugins/vuetify.js";

const app = createApp(App);
app.use(router)
    .use(vuetify);
const pinia = createPinia();
pinia.use(piniaPluginPersistence) // 使用持久化插件
app.use(pinia)
app.mount('#app');


