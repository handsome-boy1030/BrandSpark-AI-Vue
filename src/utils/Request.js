import axios from 'axios';
import { getToken, setToken } from './Storage.js';
import { snackbar } from '@/utils/Snackbar.js'; //用于弹出提示信息的
import router from '../router.js';
import Utils from './Utils.js';

const baseURL = import.meta.env.VITE_APP_DEV;
axios.defaults.headers['Content-Type'] = 'application/json;charset=utf-8';
// 创建axios实例
const service = axios.create({
    baseURL: import.meta.env.VITE_APP_DEV,
    timeout: 20000
});
// 请求拦截器
service.interceptors.request.use(config => {
    if (config.token) {
        config.headers['Authorization'] = `Bearer ${getToken()}`;
    }
    return config;
}, error => {
    console.error('request error:', error);
    return Promise.reject(error);
});

// 响应拦截器 (进行替换)
service.interceptors.response.use(res => {
    const { config: { download }, data } = res;
    if (download) return data;
    const { code, msg } = data;
    if (code === 200) return data;
    switch (code) {
        case 401:
            setToken(null);
            requestAnimationFrame(() => router.push('/login'));
            break;
        default:
            // 3. 将 ElMessage.error 替换为 snackbar.error
            snackbar.error(msg);
            break;
    }
    return Promise.reject(msg);
}, error => {
    let message = "服务器开小差了";
    console.error('response error:', error);
    if (error.response && error.response.data && typeof error.response.data.msg === 'string') {
        message = error.response.data.msg;
    } else if (error.message) {
        if (error.message.includes('timeout')) {
            message = '请求超时，请检查您的网络连接';
        } else if (error.message.includes('Network Error')) {
            message = '网络连接异常，无法连接到服务器';
        } else {
            message = '请求处理失败，请联系管理员';
        }
    } else if (error.message === 'Network Error') {
        message = error.response.data.msg;
        requestAnimationFrame(() => router.push('/login'));
    }

    // 3. 统一弹出提示，同样进行替换
    snackbar.error(message);
    return Promise.reject(error);
});
export default {
    get(url, params = {}) {
        const cloneData = JSON.parse(JSON.stringify(params));
        Object.keys(cloneData).forEach(key => {
            if (params[key] instanceof Date) {
                cloneData[key] = Utils.convertDateToString(params[key]);
            }
        });
        return service.get(url, {
            params: cloneData,
            token: true
        });
    },
    getWithoutToken(url, params) {
        return service.get(url, {
            params
        });
    },
    post(url, data = {}) {
        const cloneData = JSON.parse(JSON.stringify(data));
        Object.keys(cloneData).forEach(key => {
            if (data[key] instanceof Date) {
                cloneData[key] = Utils.convertDateToString(data[key]);
            }
        });
        return service.post(url, cloneData, {token: true});
    },
    postWithoutToken(url, data = {}) {
        return service.post(url, data, {token: false});
    },
    put(url, data = {}) {
        const cloneData = JSON.parse(JSON.stringify(data));
        Object.keys(cloneData).forEach(key => {
            if (data[key] instanceof Date) {
                cloneData[key] = Utils.convertDateToString(data[key]);
            }
        });
        return service.put(url, cloneData, {token: true});
    },
    delete(url, ids) {
        let requestUrl = url;
        let config = { token: true };
        if (Array.isArray(ids) && ids.length > 0) {
            requestUrl = url + ids.join(',');
        } else if (typeof ids === 'object' && ids !== null) {
            config.params = ids;
        }
        return service.delete(requestUrl, config);
    },
    downloadFile(url, params = {}, fileName) {
        return (service.get(url, {
            responseType: 'blob',
            token: true,
            download: true,
            params
        }).then(res => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(res);
            link.setAttribute('download', fileName || Utils.getFileNameFromURL(url));
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }));
    },
    upload(url, formData, config = {}) {
        return service.post(url, formData, {
            ...config, // 合并传入的配置，比如 onUploadProgress
            token: true, // 确保请求拦截器会添加 Token
            headers: {
                'Content-Type': 'multipart/form-data' // 通常由浏览器自动设置，但明确指出无害
            }
        });
    },
    previewFile(url) {
        return service.get(url, {
            responseType: 'blob',
            token: true,
            download: true
        });
    },
    getConfigByKey(key) {
        return service.get(`/system/config/configKey/${key}`);
    },
    /**
     * 发起一个返回Promise的流式请求 (SSE)。
     * @param {string} url - 请求的相对路径。
     * @param {object} data - 发送的POST数据。
     * @param {object} callbacks - 只包含 onChunk 回调。
     * @param {function(string): void} callbacks.onChunk - 接收到每个数据块时的回调。
     * @returns {Promise<void>} - 当流成功结束时 resolve，发生错误时 reject。
     */
    stream(url, data, {onChunk}) {
        // 返回一个新的 Promise，这是关键
        return new Promise(async (resolve, reject) => {
            try {
                // 使用 URL 构造函数来安全地拼接 URL
                const fullUrl = new URL(url, baseURL).href;

                const response = await fetch(fullUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getToken()}`
                    },
                    body: JSON.stringify(data)
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    throw new Error(`服务器错误: ${response.status} - ${errorText}`);
                }

                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const {done, value} = await reader.read();
                    if (done) {
                        // 当流正常结束时，resolve Promise
                        resolve();
                        break;
                    }
                    const chunk = decoder.decode(value, {stream: true});
                    // 调用 onChunk 回调来处理实时数据
                    if (onChunk) {
                        onChunk(chunk);
                    }
                }
            } catch (error) {
                console.error("流式请求封装中捕获到错误:", error);
                // 当发生任何错误时，reject Promise
                reject(error);
            }
        });
    }
};
