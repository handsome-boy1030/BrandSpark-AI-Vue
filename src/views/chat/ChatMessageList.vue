<template>
  <div class="chat-view">
    <v-overlay :model-value="isLoadingHistory" class="align-center justify-center" persistent>
      <v-progress-circular indeterminate color="primary" size="64"/>
    </v-overlay>

    <div ref="scrollContainerRef" class="message-scroll-container">
      <div class="message-list">
        <transition-group name="message-fade" tag="div">
          <div
              v-for="message in messages"
              :key="message.id"
              class="message-item-wrapper"
              :class="message.role === 'user' ? 'justify-end' : 'justify-start'"
          >
            <!-- 为助手添加头像 -->
            <v-avatar v-if="message.role === 'assistant'" size="32" class="me-3 flex-shrink-0">
              <v-icon>mdi-robot-outline</v-icon>
            </v-avatar>

            <!-- 消息气泡 -->
            <v-sheet
                max-width="90%"
                class="pa-4 message-bubble"
                border
                :rounded="'xl'"
                :color="message.role === 'user' ? 'user-bubble' : 'assistant-bubble'"
            >
              <!-- 【1. 渲染图片 - 新增部分】 -->
              <div v-if="message.images && message.images.length > 0" class="image-container mb-2">
                <div
                    v-for="(image, index) in message.images"
                    :key="image.id"
                    class="sent-image-wrapper"
                    @click="openImagePreview(message.images, index)"
                >
                  <img :src="getFullImageUrl(image)" alt="用户发送的图片" class="sent-image"/>
                </div>
              </div>

              <!-- 打字指示器 -->
              <div v-if="message.role === 'assistant' && isLoading && message.id === loadingMessageId && !message.content" class="typing-indicator">
                <span/> <span/> <span/>
              </div>

              <!-- 【2. 渲染文本 - 仅当文本存在时】 -->
              <div v-else-if="message.content" class="markdown-content" v-html="renderMarkdown(message.content)"/>

            </v-sheet>
          </div>
        </transition-group>
      </div>
    </div>

    <!-- 2. 功能完备的图片预览 Overlay -->
    <v-overlay v-model="imagePreview.visible" class="image-preview-overlay" content-class="d-flex align-center justify-center">
      <div class="d-flex align-center" style="height: 100%;">
        <!-- 左切换按钮 -->
        <v-btn icon="mdi-chevron-left" variant="text" size="x-large" @click="prevImage" :disabled="!canGoPrev" class="nav-btn" />

        <img
            v-if="imagePreview.currentSrc"
            :src="imagePreview.currentSrc"
            alt="图片预览"
            class="previewed-image"
            style="
          object-fit: contain; /* 确保图片完整显示 */
          max-height: 90vh;
          max-width: 85vw;
        "
        />

        <!-- 右切换按钮 -->
        <v-btn icon="mdi-chevron-right" variant="text" size="x-large" @click="nextImage" :disabled="!canGoNext" class="nav-btn" />
      </div>
      <!-- 关闭按钮 -->
      <v-btn icon="mdi-close" variant="text" class="close-preview-btn" @click="closeImagePreview" />
    </v-overlay>

  </div>
</template>

<script setup>
import {ref, nextTick, reactive, computed} from 'vue';
import DOMPurify from 'dompurify';
import {marked} from "marked";

const props = defineProps({
  messages: {type: Array, required: true},
  isLoading: {type: Boolean, required: true},
  loadingMessageId: {type: [Number, String, null], required: true},
  isLoadingHistory: {type: Boolean, required: true},
});

const scrollContainerRef = ref(null);
// --- 【 新增图片预览状态和方法】 ---
const imagePreview = reactive({
  visible: false,
  currentIndex: 0,
  currentSrc: '',
  imageList: [], // 存储当前正在预览的图片列表
});
// 计算属性，判断是否可以向前或向后切换
const canGoPrev = computed(() => imagePreview.currentIndex > 0);
const canGoNext = computed(() => imagePreview.currentIndex < imagePreview.imageList.length - 1);
const getFullImageUrl = (image) => {
  // 基本的健壮性检查
  if (!image || !image.url) {
    return '';
  }

  // ✅ 关键修复：检查 URL 是否为本地预览 URL (Blob 或 Base64)
  // 如果是，直接返回这个 URL，不做任何修改。
  if (image.url.startsWith('blob:') || image.url.startsWith('data:')) {
    return image.url;
  }

  // --- 如果不是本地 URL，则执行我们之前的服务器 URL 拼接逻辑 ---

  const backendBaseUrl = import.meta.env.VITE_APP_API_BASE_URL;

  // 如果环境变量没有加载成功，给一个明确的警告，方便调试
  if (!backendBaseUrl) {
    console.error("环境变量 VITE_APP_API_BASE_URL 未加载！");
    // 在开发环境下可以返回一个相对路径作为备用
    return image.url;
  }

  // 确保不会出现双斜杠 (//) 的情况
  return `${backendBaseUrl}${image.url}`;
};
// 打开预览器的方法
// 【使用这个版本来调试】
const openImagePreview = (images, startIndex) => {
  console.log("--- 打开图片预览 ---");
  console.log("接收到的图片列表(images):", images);
  console.log("点击的索引(startIndex):", startIndex);

  // 从列表中获取被点击的图片对象
  const currentImageObject = images[startIndex];
  console.log("当前图片对象(currentImageObject):", currentImageObject);

  if (!currentImageObject) {
    console.error("错误：无法根据索引找到图片对象！预览失败。");
    return; // 提前退出，防止后续错误
  }

  // 计算最终的 URL
  const finalImageUrl = getFullImageUrl(currentImageObject);
  console.log("计算出的最终URL(finalImageUrl):", finalImageUrl);

  // 更新状态
  imagePreview.imageList = images;
  imagePreview.currentIndex = startIndex;
  imagePreview.currentSrc = finalImageUrl;
  imagePreview.visible = true;

  console.log("更新后的预览状态(imagePreview):", imagePreview);
  console.log("----------------------");
};
// 关闭预览器
const closeImagePreview = () => {
  imagePreview.visible = false;
};

// 切换到上一张
const prevImage = () => {
  if (canGoPrev.value) {
    imagePreview.currentIndex--;
    imagePreview.currentSrc = getFullImageUrl(imagePreview.imageList[imagePreview.currentIndex]);
    // imagePreview.currentSrc = getFullImageUrl(imagePreview.imageList[imagePreview.currentIndex].url);
  }
};

// 切换到下一张
const nextImage = () => {
  if (canGoNext.value) {
    imagePreview.currentIndex++;
    imagePreview.currentSrc = getFullImageUrl(imagePreview.imageList[imagePreview.currentIndex]);
    // imagePreview.currentSrc = getFullImageUrl(imagePreview.imageList[imagePreview.currentIndex].url);
  }
};
const renderMarkdown = (content) => {
  if (!content) return '';
  const rawHtml = marked.parse(content);
  return DOMPurify.sanitize(rawHtml);
};
const scrollToBottom = () => {
  nextTick(() => {
    const container = scrollContainerRef.value;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  });
};

defineExpose({
  scrollToBottom,
});
</script>

<style scoped>
.chat-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.message-scroll-container {
  flex-grow: 1;
  overflow-y: auto;
}

.message-list {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 820px;
  margin: 0 auto;
}

.message-item-wrapper {
  display: flex;
  align-items: flex-start;
}

/* 动画样式 */
.message-fade-enter-active, .message-fade-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.message-fade-enter-from, .message-fade-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

/* 打字指示器样式 */
.typing-indicator {
  display: flex;
  align-items: center;
  gap: 5px;
  min-height: 24px;
}

.typing-indicator span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: currentColor;
  opacity: 0.7;
  animation: bounce 1.4s infinite ease-in-out both;
}

.typing-indicator span:nth-child(1) {
  animation-delay: -0.32s;
}

.typing-indicator span:nth-child(2) {
  animation-delay: -0.16s;
}

/*
 * === 关键部分：局部 Markdown 样式覆盖 ===
 * 这里的样式是专门为了适配聊天气泡的背景色而存在的。
 * 它们会覆盖 _markdown.scss 中的一些默认样式。
 */
.message-bubble :deep(.markdown-content) {
  /*
   * 继承气泡的文字颜色 (由 Vuetify 主题中的 on-user-bubble 或 on-assistant-bubble 决定)
   * 这样可以确保无论气泡背景是什么颜色，文字都能看清。
   */
  color: currentColor;

  /*
   * 覆盖代码块的背景色，使其在有色气泡中更和谐。
   * 使用半透明的黑色/白色可以适应不同的气泡背景。
   */

  pre {
    background-color: rgba(0, 0, 0, 0.2);
    color: #f8f8f2; /* 为深色背景提供一个固定的亮色文字颜色 */
  }

  code:not(pre > code) {
    background-color: rgba(0, 0, 0, 0.1);
  }
}

/* 如果是暗色主题，可以对代码块颜色进行微调 */
.v-theme--dark .message-bubble :deep(.markdown-content) {
  pre {
    background-color: rgba(255, 255, 255, 0.1);
    color: #f8f8f2;
  }

  code:not(pre > code) {
    background-color: rgba(255, 255, 255, 0.15);
  }
}
/* --- 【5. 新增图片相关样式】 --- */
.image-container {
  /* 使用 Flexbox 布局，让图片可以自然排列 */
  display: flex;
  flex-wrap: wrap; /* 允许多张图片换行 */
  gap: 8px;
}

.sent-image-wrapper {
  /* 关键点1: 为容器设置最大尺寸边界 */
  max-width: 320px;  /* 图片最大宽度 */
  max-height: 240px; /* 图片最大高度 */

  /* 让容器尺寸自适应内部图片，而不是固定大小 */
  display: inline-flex; /* 或者 display: flex; */
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.sent-image-wrapper:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.sent-image {
  max-width: 100%;
  max-height: 100%;
  display: block; /* 消除图片底部的空白间隙 */
}

/* 预览器 Overlay 样式 */
.image-preview-overlay {
  backdrop-filter: blur(5px);
  background: rgba(0,0,0,0.8);
}

.previewed-image {
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.5);
}

.close-preview-btn {
  position: absolute;
  top: 16px;
  right: 16px;
  color: white; /* 确保在深色背景下可见 */
}

.nav-btn {
  color: white;
  opacity: 0.7;
  transition: opacity 0.2s;
}
.nav-btn:hover {
  opacity: 1;
}
.nav-btn:disabled {
  opacity: 0.2;
}
</style>