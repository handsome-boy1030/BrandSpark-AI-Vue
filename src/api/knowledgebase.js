import Request from '@/utils/Request.js';
const api = {
    // 获取文章列表
    getArticles(params) {
        return Request.get('/kb', { params });
    },
    // 获取文章详情
    getArticleDetail(id) {
        return Request.get(`/kb/${id}`);
    },
    // 更新文章
    updateArticle(id, data) {
        return Request.put(`/kb/${id}`, data);
    },
    // 删除文章
    deleteArticle(id) {
        return Request.delete(`/kb/${id}`);
    },
    // 上传新知识文件
    uploadArticle(formData, onUploadProgress) {
        return Request.upload('/documents/upload', formData, { onUploadProgress });
    },
    //获取全部标签
    getAllTags(){
        return Request.get(`/kb/tags`);
    }
};

export default api;