import { defineStore } from 'pinia'
import { ref, watchEffect } from 'vue'

export const useThemeStore = defineStore('theme', () => {
    // 1. 定义状态：从 localStorage 读取初始值，默认为 'light'
    const theme = ref(localStorage.getItem('theme') || 'light')

    // 2. 定义 action (方法) 来切换主题
    function toggleTheme() {
        theme.value = theme.value === 'light' ? 'dark' : 'light'
    }

    // 3. 定义 action 来设置特定主题
    function setTheme(newTheme) {
        if (['light', 'dark'].includes(newTheme)) {
            theme.value = newTheme;
        }
    }

    // 4. 使用 watchEffect 监听 theme 的变化，并执行副作用
    watchEffect(() => {
        // a. 将新主题保存到 localStorage，以便下次打开页面时保持
        localStorage.setItem('theme', theme.value)

        // b. 在 <html> 根元素上添加或移除 'dark' 类
        //    这是让你的 CSS 变量生效的关键！
        if (theme.value === 'dark') {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    })

    // 5. 将需要暴露给组件的状态和方法返回
    return { theme, toggleTheme, setTheme }
})