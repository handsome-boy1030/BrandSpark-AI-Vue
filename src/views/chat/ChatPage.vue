<template>
  <div class="chat-page-container">
    <!-- 欢迎视图：当没有聊天会话ID时显示 -->
    <WelcomeView v-if="!currentSessionId"/>

    <!-- 聊天视图：有聊天会话ID时显示 -->
    <div v-else class="chat-view-container">
      <ChatMessageList
          ref="chatMessageListRef"
          :messages="messages"
          :is-loading="isLoading"
          :loading-message-id="loadingMessageId"
          :is-loading-history="isLoadingHistory"
      />
    </div>

    <!-- 输入区始终显示，除非在欢迎页且你想隐藏它 -->
    <div class="input-zone">
<!--      &lt;!&ndash; ChatFileDisplay 用于显示已关联和待发送的文档 &ndash;&gt;-->
<!--      <ChatFileDisplay-->
<!--          v-if="attachedFiles.length > 0"-->
<!--          :files="attachedFiles"-->
<!--          @delete="handleDeleteFile"-->
<!--      />-->

      <ChatInput
          ref="chatInputRef"
          :is-loading="isLoading"
          :chat-id="currentSessionId"
          :attached-files-count="attachedFiles.length"
          v-model:pending-images="pendingImagePreviews"
          @send-message="handleSendMessage"
          @file-uploaded="handleFileUploaded"
      />
    </div>
  </div>
</template>

<script setup>
import {ref, watch, onMounted, onUnmounted, nextTick} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {snackbar} from '@/utils/Snackbar.js'; //用于弹出提示信息的
import Request from '@/utils/Request.js';
import signalr from '@/utils/Signalr.js';
// 引入新组件
import WelcomeView from '@/views/chat/WelcomeView.vue';
import ChatMessageList from '@/views/chat/ChatMessageList.vue';
import ChatInput from '@/views/chat/ChatInput.vue';
import ChatFileDisplay from "@/views/chat/ChatFileDisplay.vue";

// --- 父组件的核心状态 ---
const messages = ref([]);
const isLoading = ref(false);
const isLoadingHistory = ref(false);
const loadingMessageId = ref(null);
const currentSessionId = ref(null);
const attachedFiles = ref([]); // 用于在UI上显示的所有文件（包括已关联和待关联的）
const pendingFiles = ref([]);   // 只存储已上传但还未随消息发送的文档
const pendingImagePreviews = ref([]);
// --- 组件引用 ---
const chatMessageListRef = ref(null);
const chatInputRef = ref(null);

const route = useRoute();
const router = useRouter();
/**
 * 统一的消息发送处理器 (最终健壮版 - 再一次修正)
 */
const handleSendMessage = (prompt) => {
  if (pendingImagePreviews.value.some(img => img.status === 'uploading')) {
    snackbar.warning('请等待所有图片上传完成再发送。');
    return;
  }
  if (isLoading.value) return;

  const imagesForUI = pendingImagePreviews.value.map(img => ({
    id: img.id || img.tempId,
    url: img.previewUrl
  }));

  const userMessage = {
    id: Date.now() + Math.random(),
    role: 'user',
    content: prompt,
    images: imagesForUI
  };
  const aiPlaceholderMessage = {
    id: Date.now() + Math.random(),
    role: 'assistant',
    content: '',
  };

  messages.value.push(userMessage, aiPlaceholderMessage);
  loadingMessageId.value = aiPlaceholderMessage.id;
  isLoading.value = true;
  nextTick(() => chatMessageListRef.value?.scrollToBottom());

  const imageIdsToSend = pendingImagePreviews.value
      .filter(img => img.status === 'success' && img.id)
      .map(img => img.id);

  const dataToSend = {
    sessionId: currentSessionId.value,
    messages: [{ role: 'user', content: prompt }],
    documentIds: pendingFiles.value.map(f => f.id),
    imageIds: imageIdsToSend,
  };
  let isNewSessionHandled = false;

  // ✅ 关键点 1: 在这里创建副本，为稍后的清理做准备
  const previewsToRevoke = [...pendingImagePreviews.value];

  // 清空待发送列表
  pendingFiles.value = [];
  pendingImagePreviews.value = [];

  // ✅ 关键点 2: 删除了函数中间那行错误的 revoke 调用

  Request.stream('/chat/stream', dataToSend, {
    onChunk: (chunk) => {
      if (!isNewSessionHandled && chunk.startsWith('[SESSION_ID:')) {
        const newIdMatch = chunk.match(/\[SESSION_ID:(\d+)\]/);
        if (newIdMatch && newIdMatch[1]) {
          const newSessionId = parseInt(newIdMatch[1], 10);
          currentSessionId.value = newSessionId;
          router.replace({path: `/chat/${newSessionId}`}).then(() => {
            loadHistory(newSessionId);
            fetchAttachedFiles(newSessionId);
          });
          window.dispatchEvent(new CustomEvent('new-session-created'));
          isNewSessionHandled = true;
          chunk = chunk.replace(/\[SESSION_ID:\d+\]/, '');
        }
      }
      const aiMessage = messages.value.find(m => m.id === loadingMessageId.value);
      if (aiMessage && chunk) {
        aiMessage.content += chunk;
        chatMessageListRef.value?.scrollToBottom();
      }
    }
  }).then(() => {
    if (currentSessionId.value) {
      fetchAttachedFiles(currentSessionId.value);
    }
  }).catch(error => {
    const userMsgIndex = messages.value.findIndex(m => m.id === userMessage.id);
    const aiMsgIndex = messages.value.findIndex(m => m.id === aiPlaceholderMessage.id);
    if (aiMsgIndex !== -1) messages.value.splice(aiMsgIndex, 1);
    if (userMsgIndex !== -1) messages.value.splice(userMsgIndex, 1);
    console.error(`请求失败: ${error.message || '未知错误'}`);
  }).finally(() => {
    isLoading.value = false;
    loadingMessageId.value = null;

    // ✅ 关键点 3: 在这里，使用我们之前创建的副本，安全地清理Blob URL
    previewsToRevoke.forEach(img => URL.revokeObjectURL(img.previewUrl));

    chatInputRef.value?.focus();
  });
};

/**
 * 处理文件上传成功事件
 * 从 ChatInput 发出的 'fileUploaded' 事件回调
 * @param uploadResult { type: 'document' | 'image', data: DocumentVo | ImageVo }
 */
const handleFileUploaded = (uploadResult) => {
  if (uploadResult && uploadResult.data) {
    const fileInfo = {
      id: uploadResult.data.id,
      fileName: uploadResult.data.fileName,
      fileSize: uploadResult.data.fileSize,
      url: uploadResult.data.url, // 对于图片，这里会有 URL
      type: uploadResult.type, // 'document' 或 'image'
    };

    // 对于文档，添加到 pendingFiles
    if (fileInfo.type === 'document') {
      pendingFiles.value.push(fileInfo);
      // 同时添加到 attachedFiles 用于 ChatFileDisplay 显示
      attachedFiles.value.unshift(fileInfo); // unshift 放到前面显示
      snackbar.success(`文档 "${fileInfo.fileName}" 已准备就绪`);
    }
  }
}

/**
 * 加载历史记录
 * @param sessionId
 */
const loadHistory = (sessionId) => {
  if (!sessionId) {
    isLoadingHistory.value = false;
    messages.value = []; // 如果没有sessionId (欢迎页)，则清空消息
    return;
  }

  isLoadingHistory.value = true;

  Request.get(`/chat/history/${sessionId}`).then(response => {
    const data = response.data;
    if (data && Array.isArray(data)) {
      const fetchedMessages = data.map(msg => ({
        id: `${msg.role}-${Date.now()}-${Math.random()}`, // 给历史消息生成新的唯一ID
        role: msg.role,
        content: msg.content,
        images: msg.images || [],
      }));
      if (loadingMessageId.value && fetchedMessages.length === 0) {
      } else {
        messages.value = fetchedMessages;
      }

      nextTick(() => chatMessageListRef.value?.scrollToBottom());
    } else {
      // 如果数据为空或不是数组，只有在没有乐观消息在处理时才清空 messages
      if (!loadingMessageId.value) {
        messages.value = [];
      }
    }
  }).finally(() => {
    isLoadingHistory.value = false;
  });
};

/**
 * 根据会话ID从后端获取文件列表
 * @param sessionId
 */
const fetchAttachedFiles = (sessionId) => {
  if (!sessionId) {
    attachedFiles.value = []; // 没有会话ID时清空文件
    return;
  }
  // 使用 Promise.all 并行请求文档和图片
  const documentPromise = Request.get(`/documents/session/${sessionId}`);
  const imagePromise = Request.get(`/images/session/${sessionId}`);

  Promise.all([documentPromise, imagePromise])
      .then(([documentResponse, imageResponse]) => {
        const documents = documentResponse.data || [];
        const images = imageResponse.data || [];

        // 给每个文件对象添加一个 type 属性，以便前端区分
        documents.forEach(doc => doc.type = 'document');
        images.forEach(img => img.type = 'image');

        const allFiles = [...documents, ...images];
        // 假设后端返回的对象有 createTime 或 updateTime 字段，按时间降序排序
        allFiles.sort((a, b) => {
          const timeA = new Date(a.updateTime || a.createTime);
          const timeB = new Date(b.updateTime || b.createTime);
          return timeB.getTime() - timeA.getTime();
        });

        // 合并 pendingFiles (待发送的文档) 和已加载的文件
        const combinedFiles = [...pendingFiles.value]; // 先把待发送的文档加进来
        allFiles.forEach(file => {
          // 避免重复添加，只添加那些不在 pendingFiles 中的文件
          if (!pendingFiles.value.some(p => p.id === file.id)) {
            combinedFiles.push(file);
          }
        });
        attachedFiles.value = combinedFiles;
      })
      .catch((error) => {
        console.error("获取附件列表失败:", error);
        attachedFiles.value = [];
        snackbar.error("加载会话附件失败，请稍后重试。");
      });
}

/**
 * 删除文件 (从UI和后端)
 * @param fileToDelete
 */
const handleDeleteFile = (fileToDelete) => {
  const {id, type} = fileToDelete;
  if (!type) {
    snackbar.error("未知的附件类型，无法删除。");
    return;
  }
  let deleteUrl = '';
  if (type === 'document') {
    deleteUrl = `/documents/${id}`;
  } else if (type === 'image') {
    deleteUrl = `/images/${id}`;
  } else {
    snackbar.error(`不支持删除类型为 "${type}" 的附件。`);
    return;
  }

  Request.delete(deleteUrl).then(() => {
    // 从显示列表和待发送列表中都移除
    attachedFiles.value = attachedFiles.value.filter(file => file.id !== id);
    pendingFiles.value = pendingFiles.value.filter(file => file.id !== id); // 移除待发送文档
    snackbar.success('附件已删除');
  }).catch((error) => {
    // 错误消息由拦截器处理
    console.error("删除附件失败:", error);
  })
}

// 监听路由变化
watch(() => route.params.id, (newId, oldId) => {
  const id = newId ? parseInt(newId, 10) : null;

  // 如果路由ID真正改变了 (不是因为 handleSendMessage 内部的替换)，或者从某个会话切换到欢迎页
  if (id !== currentSessionId.value) {
    // 只有在明确切换到无会话状态时才彻底清空消息列表
    if (id === null) {
      messages.value = [];
      isLoadingHistory.value = false;
    }
    // 无论如何，切换会话时都清空待发送文件，并准备重新加载 attachedFiles
    pendingFiles.value = [];
    attachedFiles.value = []; // 清空，待 fetchAttachedFiles 重新填充
  }

  // 总是更新 currentSessionId
  currentSessionId.value = id;

  if (id) {
    // 只有在有有效会话ID时才加载数据
    loadHistory(id);
    fetchAttachedFiles(id);
  }
}, {immediate: true});

// --- 生命周期钩子 ---
onMounted(() => {
  chatInputRef.value?.focus();

  signalr.startSignalRConnection().then(() => {
    const connection = signalr.getSignalRConnection();
    if (!connection) return;

    connection.on("DocumentProcessingStatus", (data) => {
      console.log("DocumentProcessingStatus received in parent:", data);
      if (data.status === 'completed') {
        snackbar.success(`文档 '${data.fileName}' 处理完成！`);
        // 此时文档已处理完毕并关联，如果它之前在 pendingFiles 中，后续随消息发送时会被关联。
        // 这里只是通知处理状态，不直接改变 pendingFiles
      } else if (data.status === 'failed' || data.status === 'cancelled') {
        snackbar.error(`文档 '${data.fileName}' 处理${data.status === 'failed' ? '失败' : '已取消'}：${data.message}`);
        // 如果处理失败，且该文档还在 pendingFiles 中，可以考虑移除它
        pendingFiles.value = pendingFiles.value.filter(f => f.id !== data.documentId);
        attachedFiles.value = attachedFiles.value.filter(f => f.id !== data.documentId);
      }
    });

    // 监听 SignalR 会话标题更新事件
    connection.on("SessionTitleUpdated", (data) => {
      console.log("SessionTitleUpdated received:", data);
      // 在这里可以触发左侧会话列表的刷新，例如通过再次派发自定义事件
      window.dispatchEvent(new CustomEvent('session-title-updated', {detail: data}));
    });

  }).catch(err => {
    console.error("SignalR Connection Failed:", err);
    snackbar.error("实时通信连接失败。");
  });
});

onUnmounted(() => {
  const connection = signalr.getSignalRConnection();
  if (connection) {
    connection.off("DocumentProcessingStatus");
    connection.off("SessionTitleUpdated");
  }
});
</script>

<style scoped>
/* 保持原有样式 */
.chat-page-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  background-color: var(--bg-primary);
  position: relative;
}

.chat-view-container {
  flex-grow: 1;
  overflow: hidden; /* 确保消息列表不会撑开布局 */
  display: flex;
}

.input-zone {
  flex-shrink: 0;
  width: 100%;
  background: linear-gradient(to top, var(--bg-primary), transparent);
  padding-top: 10px; /* 给文件展示区一点上边距 */
}
</style>