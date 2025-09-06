// src/plugins/vuetify.js

import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'

// 1. 定义亮色主题 (已优化)
const myCustomLightTheme = {
    dark: false,
    colors: {
        background: '#FFFFFF',
        surface: '#F7F7F8',
        primary: '#5A34B3',
        secondary: '#4E5969',
        error: '#D32F2F',
        info: '#2962FF',
        success: '#00C853',
        warning: '#F57C00',
        'on-background': '#1D2129',
        'on-surface': '#1D2129',
        'on-primary': '#FFFFFF',
        'on-secondary': '#FFFFFF',
        border: '#E5E5E5',
        // === 新增：为聊天气泡定义专属颜色 ===
        'user-bubble': '#F2F3F5',      // 用户气泡背景 (参考的浅灰色)
        'on-user-bubble': '#1D2129',   // 用户气泡文字 (深色)
        'assistant-bubble': '#FFFFFF', // 助手气泡背景 (纯白)
        'on-assistant-bubble': '#1D2129', // 助手气泡文字 (深色)
    },
}

// 2. 定义暗色主题 (已优化)
const myCustomDarkTheme = {
    dark: true,
    colors: {
        background: '#1F2023',
        surface: '#292A2D',
        primary: '#8864DD',
        secondary: '#A9AEB8',
        error: '#CF6679',
        info: '#BB86FC',
        success: '#4CAF50',
        warning: '#FB8C00',
        'on-background': '#FFFFFF',
        'on-surface': '#FFFFFF',
        'on-primary': '#1D2129',
        'on-secondary': '#000000',
        border: '#3A3B3D',
        // === 新增：为聊天气泡定义专属颜色 ===
        'user-bubble': '#3A3B3D',       // 用户气泡背景 (参考的深灰色)
        'on-user-bubble': '#FFFFFF',    // 用户气泡文字 (浅色)
        'assistant-bubble': '#292A2D',  // 助手气泡背景 (与 surface 一致，更柔和)
        'on-assistant-bubble': '#FFFFFF', // 助手气泡文字 (浅色)
    },
}

export default createVuetify({
    components,
    directives,
    theme: {
        defaultTheme: 'light',
        themes: {
            light: myCustomLightTheme,
            dark: myCustomDarkTheme,
        },
    },
    defaults: {
        VBtn: { variant: 'flat', ripple: true, size: 'small' },
        VCard: { elevation: 0, border: true, rounded: 'lg' },
        VTextField: { variant: 'outlined', density: 'compact', hideDetails: 'auto' },
        VTextarea: { variant: 'outlined', density: 'compact', hideDetails: 'auto' },
        VList: { density: 'compact', nav: true },
        VTooltip: { location: 'top' },
        VDialog: { persistent: true }
    },
})