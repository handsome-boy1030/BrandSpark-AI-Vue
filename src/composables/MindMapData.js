import { snackbar } from '@/utils/Snackbar.js';
import MindMapApi from '@/api/mindmap.js';

export function useMindMapData(graph, currentMindMapId, title, router) {

    /**
     * 从后端（类 jsMind）格式转换为 G6 可以渲染的格式
     * @param {object} rawMindMapData - 从后端获取的原始数据
     * @returns {object} - G6 TreeGraph 需要的数据格式
     */
    const transformToG6Data = (rawMindMapData) => {
        if (!rawMindMapData || !rawMindMapData.data) {
            return { id: 'root', label: '中心主题', children: [], isRoot: true };
        }

        const traverse = (node) => {
            const nodeId = node.id || `node-${Math.random().toString(36).substr(2, 9)}`;
            const nodeLabel = node.topic || '未知主题';

            return {
                id: nodeId,
                label: nodeLabel,
                side: node.side,
                children: node.children ? node.children.map(traverse) : [],
            };
        };

        const g6RootData = traverse(rawMindMapData.data);
        // 强制根节点ID为'root'，并标记为根节点
        g6RootData.id = 'root';
        g6RootData.isRoot = true;
        delete g6RootData.side;

        return g6RootData;
    };

    /**
     * 从 G6 格式递归转换为后端存储的（类 jsMind）格式
     * @param {object} node - G6 图中的节点对象
     * @returns {object} - 简化后的、用于存储的节点对象
     */
    const recursiveSimplify = (node) => {
        if (!node) return null;

        const simplified = {
            id: node.id,
            topic: node.label,
        };

        if (node.side) {
            simplified.side = node.side;
        }

        if (node.children && node.children.length > 0) {
            simplified.children = node.children.map(recursiveSimplify);
        }
        return simplified;
    };

    /**
     * 加载指定的思维导图数据到画布
     * @param {string|null} id - 思维导图的ID，如果为'new'或null则创建新导图
     */
    const loadMindMap = async (id) => {
        if (!graph.value) return;

        // 如果是创建新导图
        if (!id || id === 'new') {
            const emptyData = { id: 'root', label: '中心主题', children: [], isRoot: true };
            graph.value.data(emptyData);
            graph.value.render();
            graph.value.fitView();
            title.value = '未命名导图';
            return;
        }

        // 如果是加载现有导图
        try {
            const response = await MindMapApi.getById(id);
            const mindMap = response.data;
            title.value = mindMap.title;
            currentMindMapId.value = mindMap.id;

            let g6Data;
            try {
                const mindMapData = JSON.parse(mindMap.mindMapDataJson);
                g6Data = transformToG6Data(mindMapData);
            } catch (e) {
                console.error("解析思维导图JSON数据失败:", e);
                snackbar.error('加载导图数据失败，数据格式错误。');
                g6Data = { id: 'root', label: '数据加载失败', isRoot: true, children: [] };
            }

            graph.value.data(g6Data);
            graph.value.render();
            graph.value.fitView();

        } catch (error) {
            console.error('加载思维导图失败:', error);
            snackbar.error('加载思维导图失败，可能是ID不存在。');
            router.push('/mindmap/new');
        }
    };

    /**
     * 保存当前画布上的思维导图
     */
    const saveMindMap = async () => {
        if (!graph.value) {
            snackbar.error('导图实例不存在，无法保存。');
            throw new Error('Graph instance not available.');
        }

        const g6Data = graph.value.save();
        const mindMapData = recursiveSimplify(g6Data);

        const payload = {
            title: title.value,
            mindMapDataJson: JSON.stringify({
                meta: { name: title.value, author: "User", version: "1.0" },
                format: "node_tree",
                data: mindMapData
            })
        };

        try {
            if (currentMindMapId.value && currentMindMapId.value !== 'new') {
                // 更新现有导图
                await MindMapApi.update(currentMindMapId.value, payload);
                snackbar.success('保存成功！');
            } else {
                // 创建新导图
                const response = await MindMapApi.create(payload);
                const newMindMap = response.data;
                currentMindMapId.value = newMindMap.id;
                // 使用 replace 更新 URL，避免增加浏览器历史记录
                router.replace(`/mindmap/${newMindMap.id}`);
                snackbar.success('创建并保存成功！');
            }
        } catch (error) {
            console.error('保存思维导图失败:', error);
            const errorMessage = error.response?.data?.message || '保存失败，请稍后再试。';
            snackbar.error(errorMessage);
            // 重新抛出错误，以便调用方可以处理UI状态（如 isSaving）
            throw error;
        }
    };

    return {
        loadMindMap,
        saveMindMap,
        transformToG6Data,
    };
}