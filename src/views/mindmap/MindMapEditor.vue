<template>
  <v-container fluid class="mindmap-container pa-0">
    <!-- 顶部工具栏 -->
    <MindMapToolbar
        v-model:title="title"
        v-model:search-keyword="searchKeyword"
        :is-saving="isSaving"
        :history-index="historyIndex"
        :history-length="history.length"
        @zoom-in="zoomIn"
        @zoom-out="zoomOut"
        @fit-view="fitView"
        @undo="undo"
        @redo="redo"
        @save="saveMindMap"
        @export="handleExportCommand"
        @show-ai-generation="showTextGenerationDialog = true"
    />

    <!-- G6 画布容器 -->
    <div id="g6_container" class="mindmap-canvas"></div>

    <!-- 浮动节点编辑工具栏 -->
    <FloatingNodeToolbar
        v-if="showFloatingToolbar"
        v-model:editing-label="editingNodeLabel"
        :style="floatingToolbarStyle"
        :selected-node-id="selectedNodeId"
        :is-expanding="isExpanding"
        :has-mindmap="!!currentMindMapId"
        @add-node="addNode"
        @add-brother="addBrotherNode"
        @delete-node="deleteNode"
        @expand-node="handleExpandNode"
        @blur-edit="blurNodeEdit"
        ref="floatingToolbarRef"
    />

    <!-- 右键菜单 -->
    <ContextMenu
        v-model:show="showContextMenu"
        :position="contextMenuPosition"
        :target-is-root="contextMenuTargetNodeIsRoot"
        :history-index="historyIndex"
        :history-length="history.length"
        @add-child="handleContextMenuAddChild"
        @add-brother="handleContextMenuAddBrother"
        @delete="handleContextMenuDelete"
        @undo="undo"
        @redo="redo"
    />

    <!-- AI 生成对话框 -->
    <AIGenerationDialog
        v-model:show="showTextGenerationDialog"
        v-model:text="generationText"
        :is-generating="isGenerating"
        @generate="handleGenerateFromText"
    />
  </v-container>
</template>

<script setup>
import {ref, onMounted, onUnmounted, watch, nextTick, computed} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {onKeyStroke} from '@vueuse/core';
import {snackbar} from '@/utils/Snackbar.js';
import MindMapApi from '@/api/mindmap.js';
import Utils from '@/utils/Utils.js';

// 导入子组件
import MindMapToolbar from '@/views/mindmap/MindMapToolbar.vue';
import FloatingNodeToolbar from '@/views/mindmap/FloatingNodeToolbar.vue';
import ContextMenu from '@/views/mindmap/ContextMenu.vue';
import AIGenerationDialog from '@/views/mindmap/AIGenerationDialog.vue';

// 导入 G6 相关
import {useMindMapGraph} from '@/composables/MindMapGraph';
import {useMindMapHistory} from '@/composables/MindMapHistory';
import {useMindMapData} from '@/composables/MindMapData';

const route = useRoute();
const router = useRouter();

// 基础状态
const currentMindMapId = ref(null);
const title = ref('未命名导图');
const isSaving = ref(false);
const searchKeyword = ref('');

// 节点选中和编辑状态
const selectedNodeId = ref(null);
const editingNodeLabel = ref('');
const floatingToolbarRef = ref(null);

// 右键菜单状态
const showContextMenu = ref(false);
const contextMenuPosition = ref({x: 0, y: 0});
const contextMenuTargetNodeId = ref(null);

// 浮动工具栏状态
const showFloatingToolbar = ref(false);
const floatingToolbarPosition = ref({x: 0, y: 0});
const floatingToolbarStyle = computed(() => ({
  left: `${floatingToolbarPosition.value.x}px`,
  top: `${floatingToolbarPosition.value.y}px`,
  position: 'fixed',
  zIndex: 999,
}));

// AI 相关状态
const showTextGenerationDialog = ref(false);
const generationText = ref('');
const isGenerating = ref(false);
const isExpanding = ref(false);

// 计算属性
const contextMenuTargetNodeIsRoot = computed(() => {
  return contextMenuTargetNodeId.value === 'root';
});

// 使用组合式函数
const {
  graph,
  initGraph,
  destroyGraph,
  zoomIn,
  zoomOut,
  fitView,
  selectNodeAndActivateToolbar,
  addNode,
  addBrotherNode,
  deleteNode,
  updateNodeLabel,
} = useMindMapGraph({
  selectedNodeId,
  editingNodeLabel,
  floatingToolbarPosition,
  showFloatingToolbar,
  contextMenuTargetNodeId,
  contextMenuPosition,
  showContextMenu,
  onHistoryPush: () => pushHistory(),
});

const {
  history,
  historyIndex,
  pushHistory,
  undo,
  redo,
} = useMindMapHistory(graph);

const {
  loadMindMap,
  saveMindMap: _saveMindMap,
  transformToG6Data,
} = useMindMapData(graph, currentMindMapId, title, router);

// 包装保存函数
const saveMindMap = async () => {
  if (!title.value.trim()) {
    snackbar.warning('请输入标题');
    return;
  }

  isSaving.value = true;
  try {
    await _saveMindMap();
    window.dispatchEvent(new CustomEvent('new-session-created'));
  } finally {
    isSaving.value = false;
  }
};

// 节点编辑相关方法
const blurNodeEdit = () => {
  if (selectedNodeId.value && graph.value) {
    updateNodeLabel(selectedNodeId.value, editingNodeLabel.value);
  }
};

// 右键菜单处理
const handleContextMenuAddChild = (side) => {
  if (contextMenuTargetNodeId.value) {
    addNode(contextMenuTargetNodeId.value, side);
  }
  showContextMenu.value = false;
};

const handleContextMenuAddBrother = () => {
  if (contextMenuTargetNodeId.value) {
    addBrotherNode(contextMenuTargetNodeId.value);
  }
  showContextMenu.value = false;
};

const handleContextMenuDelete = () => {
  if (contextMenuTargetNodeId.value) {
    deleteNode(contextMenuTargetNodeId.value);
  }
  showContextMenu.value = false;
};

// AI 生成相关方法
const handleGenerateFromText = async () => {
  if (!generationText.value.trim()) {
    snackbar.warning('请输入要生成思维导图的文本内容！');
    return;
  }

  isGenerating.value = true;
  try {
    const response = await MindMapApi.generateFromText(generationText.value);
    const generatedMindMap = response.data;

    const newMindMapUrl = `${window.location.origin}/mindmap/${generatedMindMap.id}`;
    window.open(newMindMapUrl, '_blank');

    snackbar.success('思维导图生成成功，已在新标签页中打开！');
    showTextGenerationDialog.value = false;
    generationText.value = '';

    window.dispatchEvent(new CustomEvent('new-session-created'));
  } catch (error) {
    console.error("从文本生成思维导图失败:", error);
    const errorMessage = error.response?.data?.message || error.message || '生成思维导图失败，请稍后再试。';
    snackbar.error(errorMessage);
  } finally {
    isGenerating.value = false;
  }
};

const handleExpandNode = async () => {
  if (!currentMindMapId.value) {
    snackbar.warning('请先保存或创建导图才能扩展节点。');
    return;
  }
  if (!selectedNodeId.value) {
    snackbar.warning('请选择一个要扩展的节点。');
    return;
  }

  isExpanding.value = true;
  try {
    const selectedNode = graph.value.findById(selectedNodeId.value);
    if (!selectedNode) {
      snackbar.error('未找到选中的节点。');
      return;
    }

    const rootNode = graph.value.findById('root');
    const rootNodeTopic = rootNode ? rootNode.getModel().label : '';

    const parentNode = selectedNode.get('parent');
    const parentNodeText = parentNode ? parentNode.getModel().label : '';

    const siblingNodes = parentNode ? parentNode.get('children') : [];
    const siblingNodeTexts = siblingNodes
        .filter(node => node.getID() !== selectedNodeId.value)
        .map(node => node.getModel().label);

    const requestDto = {
      nodeId: selectedNodeId.value,
      nodeText: selectedNode.getModel().label,
      rootNodeTopic,
      parentNodeText,
      siblingNodeTexts,
    };

    const response = await MindMapApi.expandNode(currentMindMapId.value, requestDto);
    const updatedMindMap = response.data;

    try {
      const parsedMindMapData = JSON.parse(updatedMindMap.mindMapDataJson);
      const g6Data = transformToG6Data(parsedMindMapData);

      graph.value.data(g6Data);
      graph.value.render();
      fitView();
      selectNodeAndActivateToolbar(selectedNodeId.value);
      pushHistory();

      snackbar.success('节点扩展成功！');
    } catch (parseError) {
      console.error("解析AI扩展后返回的JSON失败:", parseError);
      snackbar.error("AI扩展数据格式异常，请尝试刷新。");
    }
  } catch (error) {
    console.error("扩展节点失败:", error);
    const errorMessage = error.response?.data?.message || error.message || '扩展节点失败，请稍后再试。';
    snackbar.error(errorMessage);
  } finally {
    isExpanding.value = false;
  }
};

// 导出功能
const handleExportCommand = (command) => {
  if (!graph.value) {
    snackbar.warning('导图尚未加载，无法导出。');
    return;
  }

  const currentGraphData = graph.value.save();
  if (currentMindMapId.value === null && title.value === '未命名导图' &&
      (!currentGraphData.children || currentGraphData.children.length === 0)) {
    snackbar.warning('这是一个空导图，无需导出。');
    return;
  }

  const baseFilename = Utils.sanitizeFilename(title.value || '未命名导图');
  const filenameWithDate = `${baseFilename}-${new Date().toISOString().split('T')[0]}`;

  switch (command) {
    case 'json':
      exportAsJson(filenameWithDate);
      break;
    case 'png':
      graph.value.downloadFullImage(`${filenameWithDate}`, 'image/png');
      snackbar.success('PNG图片导出成功！');
      break;
    case 'svg':
      graph.value.downloadFullImage(`${filenameWithDate}`, 'svg');
      snackbar.success('SVG图片导出成功！');
      break;
    case 'md':
      exportAsMarkdown(filenameWithDate);
      break;
  }
};

const exportAsJson = (filename) => {
  const fullG6Data = graph.value.save();
  const finalJsMindData = recursiveSimplify(fullG6Data);
  const exportData = {
    meta: {name: title.value, author: "User", version: "1.0"},
    format: "node_tree",
    data: finalJsMindData
  };
  const jsonString = JSON.stringify(exportData, null, 2);

  downloadFile(jsonString, `${filename}.json`, 'application/json');
  snackbar.success('JSON导出成功！');
};

const exportAsMarkdown = (filename) => {
  const fullG6Data = graph.value.save();
  const markdownContent = Utils.convertG6ToMarkdown(fullG6Data, 0);

  downloadFile(markdownContent, `${filename}.md`, 'text/markdown;charset=utf-8');
  snackbar.success('Markdown导出成功！');
};

const downloadFile = (content, filename, mimeType) => {
  const blob = new Blob([content], {type: mimeType});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const recursiveSimplify = (node) => {
  if (!node) return null;
  const simplified = {
    id: node.id,
    topic: node.label,
  };
  if (node.side) simplified.side = node.side;
  if (node.children && node.children.length > 0) {
    simplified.children = node.children.map(recursiveSimplify);
  }
  return simplified;
};

// 键盘快捷键
const setupKeyboardShortcuts = () => {
  onKeyStroke('Enter', (e) => {
    if (document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        !showTextGenerationDialog.value) {
      if (selectedNodeId.value) {
        addBrotherNode(selectedNodeId.value);
      } else {
        saveMindMap();
      }
      e.preventDefault();
    }
  });

  onKeyStroke('Tab', (e) => {
    if (selectedNodeId.value && !showTextGenerationDialog.value) {
      addNode(selectedNodeId.value, 'right');
      e.preventDefault();
    }
  });

  onKeyStroke('Delete', (e) => {
    if (document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        !showTextGenerationDialog.value) {
      deleteNode(selectedNodeId.value);
      e.preventDefault();
    }
  });

  onKeyStroke('z', (e) => {
    if ((e.ctrlKey || e.metaKey) && !showTextGenerationDialog.value) {
      undo();
      e.preventDefault();
    }
  });

  onKeyStroke('y', (e) => {
    if ((e.ctrlKey || e.metaKey) && !showTextGenerationDialog.value) {
      redo();
      e.preventDefault();
    }
  });
};

// 生命周期
onMounted(() => {
  initGraph();
  setupKeyboardShortcuts();

  // 监听路由变化
  watch(() => route.params.id, (newId) => {
    currentMindMapId.value = newId;
    loadMindMap(newId);
  }, {immediate: true});

  // 监听选中节点变化
  watch(selectedNodeId, (newId) => {
    if (newId && graph.value) {
      const node = graph.value.findById(newId);
      if (node) {
        editingNodeLabel.value = node.getModel().label;
      }
    } else {
      editingNodeLabel.value = '';
      showFloatingToolbar.value = false;
    }
  });
});

onUnmounted(() => {
  destroyGraph();
});
</script>

<style scoped>
.mindmap-container {
  height: 100vh;
  position: relative;
}

.mindmap-canvas {
  width: 100%;
  height: calc(100vh - 64px); /* 减去顶部工具栏高度 */
}
</style>