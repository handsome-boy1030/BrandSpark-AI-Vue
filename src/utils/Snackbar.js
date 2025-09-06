import { reactive, readonly } from 'vue';

// 这是一个在模块作用域内的单例响应式对象
const state = reactive({
    show: false,
    text: '',
    color: 'info',
    timeout: 3000,
    variant: 'filled', // 添加变体支持
    location: 'top',   // 添加位置支持
    multiLine: false,  // 添加多行支持
});

// 封装一个基础的显示函数
const showMessage = (text, options = {}) => {
    state.text = text;
    state.color = options.color || 'info';
    state.timeout = options.timeout || 3000;
    state.variant = options.variant || 'filled';
    state.location = options.location || 'top';
    state.multiLine = options.multiLine || false;
    state.show = true;
};

// 直接导出这些方法，以便在 JS 模块中直接使用
export const snackbar = {
    success: (text, options = {}) => showMessage(text, { color: 'success',timeout: 3000, ...options }),
    error: (text, options = {}) => showMessage(text, { color: 'error', timeout: 3000, ...options }),
    warning: (text, options = {}) => showMessage(text, { color: 'warning', timeout: 3000, ...options }),
    info: (text, options = {}) => showMessage(text, { color: 'info',timeout: 3000, ...options }),
    // 添加更多便捷方法
    show: (text, options = {}) => showMessage(text, options),
    hide: () => (state.show = false),
};

// 继续导出 useSnackbar Composable，以便在 Vue 组件中使用
export function useSnackbar() {
    return {
        snackbarState: readonly(state), // 在组件中通常只需要读取状态
        hideSnackbar: () => (state.show = false),
        showSnackbar: showMessage,
        ...snackbar, // 包含所有快捷方法
    };
}

// 默认导出，便于不同的导入方式
export default snackbar;