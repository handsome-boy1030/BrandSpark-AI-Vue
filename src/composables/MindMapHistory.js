import { ref } from 'vue';
import { snackbar } from '@/utils/Snackbar.js';

export function useMindMapHistory(graph) {
    const history = ref([]);
    const historyIndex = ref(-1);
    const MAX_HISTORY_LENGTH = 50;

    // 简化节点数据，只保留必要的属性
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

    // 标记根节点
    const markRoot = (node) => {
        if (!node) return;
        node.isRoot = node.id === 'root';
        if (node.children) {
            node.children.forEach(markRoot);
        }
    };

    // 添加历史记录
    const pushHistory = () => {
        if (!graph.value) return;

        try {
            const currentData = graph.value.save();
            const simplifiedData = recursiveSimplify(currentData);
            const currentJson = JSON.stringify(simplifiedData);

            // 避免重复的历史记录
            if (historyIndex.value >= 0 &&
                JSON.stringify(history.value[historyIndex.value]) === currentJson) {
                return;
            }

            // 如果当前不在历史记录末尾，删除后续记录
            if (historyIndex.value < history.value.length - 1) {
                history.value = history.value.slice(0, historyIndex.value + 1);
            }

            // 添加新记录
            history.value.push(simplifiedData);

            // 限制历史记录长度
            if (history.value.length > MAX_HISTORY_LENGTH) {
                history.value.shift();
            } else {
                historyIndex.value = history.value.length - 1;
            }
        } catch (error) {
            console.error('保存历史记录失败:', error);
        }
    };

    // 应用历史记录
    const applyHistory = (index) => {
        if (!graph.value || index < 0 || index >= history.value.length) {
            return;
        }

        try {
            const dataToApply = history.value[index];

            // 深拷贝数据
            const g6Data = JSON.parse(JSON.stringify(dataToApply));

            // 转换为G6格式
            const transformedData = transformToG6Format(g6Data);
            markRoot(transformedData);

            // 应用数据
            graph.value.data(transformedData);
            graph.value.render();
            graph.value.fitView();

            // 清除选中状态
            graph.value.getNodes().forEach(node =>
                graph.value.clearItemStates(node, 'selected')
            );

        } catch (error) {
            console.error('应用历史记录失败:', error);
            snackbar.error('历史记录数据异常');
        }
    };

    // 转换为G6格式
    const transformToG6Format = (node) => {
        if (!node) return null;

        const g6Node = {
            id: node.id,
            label: node.topic || node.label,
        };

        if (node.side) {
            g6Node.side = node.side;
        }

        if (node.children && node.children.length > 0) {
            g6Node.children = node.children.map(transformToG6Format);
        }

        return g6Node;
    };

    // 撤销
    const undo = () => {
        if (historyIndex.value > 0) {
            historyIndex.value--;
            applyHistory(historyIndex.value);
            snackbar.success('已撤销');
        } else {
            snackbar.warning('没有更多可以撤销的操作了');
        }
    };

    // 重做
    const redo = () => {
        if (historyIndex.value < history.value.length - 1) {
            historyIndex.value++;
            applyHistory(historyIndex.value);
            snackbar.success('已重做');
        } else {
            snackbar.warning('没有更多可以重做的操作了');
        }
    };

    // 清空历史记录
    const clearHistory = () => {
        history.value = [];
        historyIndex.value = -1;
    };

    // 获取当前历史状态
    const getHistoryState = () => ({
        canUndo: historyIndex.value > 0,
        canRedo: historyIndex.value < history.value.length - 1,
        historyLength: history.value.length,
        currentIndex: historyIndex.value
    });

    return {
        history,
        historyIndex,
        pushHistory,
        undo,
        redo,
        clearHistory,
        getHistoryState
    };
}