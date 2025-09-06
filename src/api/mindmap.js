import Request from '@/utils/Request.js';

const prefix = '/mindmaps';

export default {
    /**
     * 获取当前用户的所有思维导图列表
     * @returns {Promise<axios.AxiosResponse<any>>}
     */
    getList() {
        return Request.get(`${prefix}`);
    },

    /**
     * 根据ID获取单个思维导图的详细数据
     * @param {string} id - 思维导图的ID
     * @returns {Promise<axios.AxiosResponse<any>>}
     */
    getById(id) {
        return Request.get(`${prefix}/${id}`);
    },

    /**
     * 创建一个新的思维导图
     * @param {object} data - 思维导图数据，包含 title 和 mindMapDataJson
     * @returns {Promise<axios.AxiosResponse<any>>}
     */
    create(data) {
        return Request.post(`${prefix}`, data);
    },

    /**
     * 更新一个已存在的思维导图
     * @param {string} id - 思维导图的ID
     * @param {object} data - 思维导图数据，包含 title 和 mindMapDataJson
     * @returns {Promise<axios.AxiosResponse<any>>}
     */
    update(id, data) {
        return Request.put(`${prefix}/${id}`, data);
    },

    /**
     * 根据ID删除一个思维导图
     * @param {string} id - 思维导图的ID
     * @returns {Promise<axios.AxiosResponse<any>>}
     */
    delete(id) {
        return Request.delete(`${prefix}/${id}`);
    },

    /**
     * 根据文本内容，通过AI生成一个新的思维导图
     * @param {string} text - 用于生成的文本内容
     * @returns {Promise<axios.AxiosResponse<any>>}
     */
    generateFromText(text) {
        return Request.post(`${prefix}/generate-from-text`, { text });
    },

    /**
     * 针对指定思维导图中的某个节点进行AI扩展
     * @param {string} mindMapId - 思维导图的ID
     * @param {object} nodeExpansionRequest - 扩展请求的数据传输对象
     * @returns {Promise<axios.AxiosResponse<any>>}
     */
    expandNode(mindMapId, nodeExpansionRequest) {
        return Request.post(`${prefix}/${mindMapId}/expand-node`, nodeExpansionRequest);
    }
};