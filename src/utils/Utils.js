import Request from "@/utils/Request.js";
import { snackbar } from '@/utils/Snackbar.js'; //用于弹出提示信息的

export default {
    convertDateToString(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    },
    convertDateToStringDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },
    getFileUrl(url) {
        const baseUrl = import.meta.env.VITE_APP_DEV;
        let rootUrl = (baseUrl.startsWith('http') ? baseUrl : window.location.origin + baseUrl);
        if (url.startsWith('http://') || url.startsWith('https://')) {
            return url;
        }
        if (!rootUrl.endsWith('/') && !url.startsWith('/')) {
            rootUrl += '/';
        } else if (rootUrl.endsWith('/') && url.startsWith('/')) {
            url = url.substring(1);
        }

        return rootUrl + url;
    },
    getFileNameFromURL(url) {
        try {
            // 确保传入的是字符串
            if (typeof url !== 'string') {
                return '';
            }
            const split = url.split('/');
            const fileName = split[split.length - 1];
            return fileName === '' ? '' : decodeURIComponent(fileName);
        } catch (error) {
            console.error({
                error,
                url
            });
            return '';
        }
    },
    buildFileList(list) {
        const result = [];
        if (!Array.isArray(list)) {
            return [];
        }
        for (const item of list) {
            if (typeof item === 'object' && item !== null && (item.uid || item.status || item.url || item.name)) {
                result.push(item);
            } else if (typeof item === 'string' && item) {
                const fullUrl = this.getFileUrl(item);
                result.push({
                    name: this.getFileNameFromURL(fullUrl),
                    url: fullUrl,
                    status: 'success',
                    uid: Math.random().toString(36).substring(2, 15)
                });
            }
        }
        return result;
    },
    zhStr(fileArray, index = 0) {
        if (!Array.isArray(fileArray) || fileArray.length === 0 || index < 0 || index >= fileArray.length) {
            return null; // 输入无效或索引越界
        }
        const fileItem = fileArray[index];
        if (!fileItem) {
            return null;
        }
        let rawUrl = null;
        if (typeof fileItem.url === 'string' && fileItem.url) {
            rawUrl = fileItem.url;
        }
        else if (fileItem.response && typeof fileItem.response.url === 'string' && fileItem.response.url) {
            rawUrl = fileItem.response.url;
        }
        else if (typeof fileItem === 'string' && fileItem) {
            rawUrl = fileItem;
        }
        if (rawUrl) {
            // 使用已有的 getFileUrl 方法确保得到完整的、可访问的URL
            return this.getFileUrl(rawUrl);
        }
        return null;
    },
    xzFile(listOrUrl) {
    let urlToDownload = null;
    if (typeof listOrUrl === 'string' && listOrUrl) {
        urlToDownload = this.getFileUrl(listOrUrl);
    } else if (Array.isArray(listOrUrl)) {
        urlToDownload = this.zhStr(listOrUrl, 0);
    }
    if (urlToDownload) {
        Request.downloadFile(urlToDownload).then(() => {
            snackbar.success("下载成功");
        }).catch((error) => {
            const errorMessage = error.response?.data?.msg || error.message || "下载失败";
            snackbar.error(errorMessage);
        });
    } else {
        snackbar.warning("没有可供下载的文件，或无法从列表中获取有效URL。");
    }
},

    /**
     * 将 G6 树形数据结构转换为 Markdown 列表格式的字符串。
     *
     * @param {object} node G6 节点数据对象 (例如 graph.save() 返回的根节点或其子节点)
     * @param {number} level 当前节点的层级，根节点为 0。
     * @returns {string} 转换后的 Markdown 字符串。
     */
    convertG6ToMarkdown(node, level = 0) {
        if (!node || !node.label) {
            return ''; // 如果节点无效或没有 label，返回空字符串
        }

        let markdown = '';
        let prefix;

        if (level === 0) {
            // 根节点使用一级标题
            prefix = `# `;
        } else {
            // 其他层级使用列表项，通过空格缩进表示层级
            prefix = '  '.repeat(level - 1) + `- `;
        }

        markdown += `${prefix}${node.label}\n`; // 添加当前节点的 Markdown 文本

        // 递归处理子节点
        if (node.children && node.children.length > 0) {
            node.children.forEach(child => {
                markdown += this.convertG6ToMarkdown(child, level + 1); // 层级加1
            });
        }

        return markdown;
    },

    /**
     * 清理文件名中不允许的字符，确保导出文件名合法。
     * @param {string} filename 原始文件名
     * @returns {string} 清理后的文件名
     */
    sanitizeFilename(filename) {
        // 移除 Windows 和 Unix 文件名中常见的非法字符
        // \ / : * ? " < > |
        // 同时替换一些可能引起问题的字符为下划线或空字符串
        return filename.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '-'); // 替换空格为短横线，提高兼容性
    }
};