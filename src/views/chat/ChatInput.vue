<template>
  <div class="input-area-wrapper">
    <!-- 1. 图片预览区: 使用 v-sheet 和 v-hover 增强交互 -->
    <v-sheet v-if="pendingImagePreviews.length > 0" class="image-preview-area pa-3 mb-2" border rounded="lg">
      <v-hover v-for="image in pendingImagePreviews" :key="image.id" v-slot="{ isHovering, props }">
        <v-card v-bind="props" class="image-preview-card" :elevation="isHovering ? 4 : 1">
          <v-img :src="image.previewUrl" :alt="image.fileName" class="preview-thumbnail" cover/>
          <v-btn
              icon="mdi-close"
              size="x-small"
              class="remove-image-button"
              :class="{ 'show-btn': isHovering }"
              @click.stop="handleRemovePreviewImage(image)"
          />
        </v-card>
      </v-hover>

      <!-- 2. 添加更多图片按钮: 自定义组件，触发隐藏的 input -->
      <div v-if="pendingImagePreviews.length < 10" class="add-image-button" @click="triggerFileInput('image')">
        <v-icon size="24">mdi-plus</v-icon>
      </div>
    </v-sheet>

    <!-- 3. 主输入区: 使用 v-sheet for a styled container -->
    <v-sheet class="input-area pa-2" border rounded="xl">
      <!-- 4. 文档/图片上传按钮: 自定义按钮触发隐藏的 input -->
      <v-tooltip text="上传文档" location="top">
        <template v-slot:activator="{ props }">
          <v-btn v-bind="props" icon="mdi-paperclip" variant="text" @click="triggerFileInput('document')"
                 :disabled="isUploading || isLoading"/>
        </template>
      </v-tooltip>

      <v-tooltip text="上传图片 (最多10张)" location="top">
        <template v-slot:activator="{ props }">
          <v-btn v-if="pendingImagePreviews.length === 0" v-bind="props" icon="mdi-image-outline" variant="text"
                 @click="triggerFileInput('image')" :disabled="isUploading || isLoading"/>
        </template>
      </v-tooltip>

      <!-- 隐藏的文件输入框 -->
      <input ref="imageInputRef" type="file" hidden multiple accept="image/*"
             @change="handleFileSelect($event, 'image')">
      <input ref="docInputRef" type="file" hidden accept=".pdf,.txt,.doc,.docx,.xls,.xlsx"
             @change="handleFileSelect($event, 'document')">

      <!-- 5. 文本输入区: v-textarea with auto-grow -->
      <v-textarea
          ref="inputRef"
          v-model="userInput"
          placeholder="询问任何问题"
          variant="solo"
          flat
          auto-grow
          rows="1"
          max-rows="5"
          density="compact"
          hide-details
          @keydown.enter.prevent="handleEnterKey"
          :disabled="isLoading || isUploading"
      />

      <!-- 6. 发送按钮: v-btn -->
      <v-btn
          icon="mdi-send"
          variant="flat"
          color="primary"
          :disabled="!canSendMessage || isLoading || isUploading"
          :loading="isLoading"
          @click="onSendMessage"
      />
    </v-sheet>

    <!-- 7. 底部信息: 使用 v-progress-linear 显示上传进度 -->
    <div class="footer-info">
      MyAiChatApp - AI 可能会产生不准确的信息。
      <v-progress-linear
          v-if="isUploading"
          :model-value="uploadProgress"
          color="primary"
          height="6"
          rounded
          class="upload-progress-bar"
      />
      <span v-if="isUploading" class="upload-progress-text">
        正在上传: {{ uploadingFileName }} ({{ uploadProgress }}%)
      </span>
    </div>
  </div>
</template>

<script setup>
import {ref, computed, onMounted} from 'vue';
import {snackbar} from '@/utils/Snackbar.js';
import Request from "@/utils/Request.js";
import {v4 as uuidv4} from 'uuid';

const props = defineProps({
  isLoading: {type: Boolean, required: true},
  chatId: {type: [String, Number], default: null},
  attachedFilesCount: {type: Number, default: 0},
  pendingImages: {type: Array, default: () => []}
});
const emit = defineEmits(['sendMessage', 'fileUploaded', 'update:pendingImages']);

const inputRef = ref(null);
const imageInputRef = ref(null);
const docInputRef = ref(null);
const userInput = ref('');
const uploadState = ref({isUploading: false, fileName: '', progress: 0});
const pendingImagePreviews = computed({
  get: () => props.pendingImages,
  set: (newValue) => emit('update:pendingImages', newValue)
});

const isUploading = computed(() => uploadState.value.isUploading);
const uploadingFileName = computed(() => uploadState.value.fileName);
const uploadProgress = computed(() => uploadState.value.progress);
const hasAttachedFiles = computed(() => props.attachedFilesCount > 0);
const canSendMessage = computed(() => userInput.value.trim() || pendingImagePreviews.value.length > 0 || hasAttachedFiles.value);

const imageUploadUrl = `/images/upload`;
const documentUploadUrl = `/documents/upload`;

const onSendMessage = () => {
  if (!canSendMessage.value) return;
  const imageIdsToSend = pendingImagePreviews.value.map(img => img.id);
  emit('sendMessage', userInput.value, {imageIds: imageIdsToSend});
  userInput.value = '';
  inputRef.value?.focus();
};

const handleEnterKey = (event) => {
  if (isUploading.value) return;
  if (!event.shiftKey && !event.ctrlKey) onSendMessage();
};

const triggerFileInput = (fileType) => {
  if (fileType === 'image') imageInputRef.value?.click();
  else docInputRef.value?.click();
};

const handleFileSelect = (event, fileType) => {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  if (fileType === 'image') {
    const newImages = [];
    for (const file of files) {
      if (!beforeImageUpload(file)) continue; // 运行检查

      // 1. 立刻创建本地预览对象
      const tempImage = {
        tempId: uuidv4(), // 生成一个唯一的临时ID
        fileName: file.name,
        previewUrl: URL.createObjectURL(file), // ✅ 立刻生成Blob URL
        status: 'uploading', // 状态：上传中
        progress: 0,
        file: file // 保存原始文件，用于稍后上传
      };
      newImages.push(tempImage);
    }
    // 2. 立刻更新父组件的 pendingImages 数组，UI瞬间响应
    const combinedImages = [...pendingImagePreviews.value, ...newImages];
    emit('update:pendingImages', combinedImages);

// 3. 在后台开始上传这些新图片
    newImages.forEach(uploadFile);
  } else {
    // 文档逻辑可以保持不变或也采用类似模式
    if (beforeDocumentUpload(files[0])) {
      // 也可以为文档创建乐观UI，但这里保持原样以简化
      uploadOriginalDocument(files[0]);
    }
  }
  event.target.value = ''; // 重置 input
};

// 新的、接受临时图片对象作为参数的 uploadFile 函数
const uploadFile = (tempImage) => {
  const url = imageUploadUrl;
  const formData = new FormData();
  formData.append('File', tempImage.file);
  if (props.chatId) formData.append('ChatSessionId', props.chatId);

  // 更新全局上传状态，用于显示底部的总进度条
  uploadState.value = {isUploading: true, fileName: tempImage.fileName, progress: 0};

  Request.upload(url, formData, {
    onUploadProgress: (e) => {
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded * 100) / e.total);
        // 更新单个图片的进度
        tempImage.progress = progress;
        uploadState.value.progress = progress; // 更新总进度
      }
    }
  }).then(response => {
    // 上传成功，用服务器返回的真实数据更新这个图片对象
    const imageVo = response.data;
    const finalImage = {
      ...imageVo, // { id, url, fileName, ... } from server
      tempId: tempImage.tempId, // 保留临时ID用于匹配
      previewUrl: tempImage.previewUrl, // 保留Blob URL
      status: 'success' // 状态：成功
    };

    // 更新父组件中的对应项
    const updatedImages = pendingImagePreviews.value.map(img =>
        img.tempId === finalImage.tempId ? finalImage : img
    );
    emit('update:pendingImages', updatedImages);

  }).catch(error => {
    console.error(`${tempImage.fileName} 上传失败:`, error);
    // 更新状态为失败，UI上可以显示一个重试按钮
    tempImage.status = 'error';
  }).finally(() => {
    // 检查是否所有上传都已完成
    const stillUploading = pendingImagePreviews.value.some(img => img.status === 'uploading');
    if (!stillUploading) {
      uploadState.value = {isUploading: false, fileName: '', progress: 0};
    }
  });
};

const beforeImageUpload = (file) => {
  const isImage = file.type.startsWith('image/');
  const isLt30M = file.size / 1024 / 1024 < 30;
  const isLessThan10 = pendingImagePreviews.value.length < 10;
  if (!isImage) snackbar.error('只能上传图片文件!');
  if (!isLt30M) snackbar.error('图片大小不能超过 30MB!');
  if (!isLessThan10) snackbar.error('最多只能上传 10 张图片!');
  return isImage && isLt30M && isLessThan10;
};

const handleImageUploadSuccess = (imageVo, originalFile) => {
  if (imageVo?.id && imageVo?.url) {
    const newImage = {
      ...imageVo, previewUrl: URL.createObjectURL(originalFile)
    };
    const newPendingImages = [...pendingImagePreviews.value, newImage];
    emit('update:pendingImages', newPendingImages);
  } else {
    snackbar.error('图片上传成功，但缺少信息！');
  }
};
const handleDocumentUploadSuccess = (docVo) => {
  emit('fileUploaded', {type: 'document', data: docVo});
  snackbar.success('文档上传成功！');
};

const handleRemovePreviewImage = (imageToRemove) => {
  // 1. 清理本地资源
  const newPendingImages = pendingImagePreviews.value.filter(img =>
      (img.id || img.tempId) !== (imageToRemove.id || imageToRemove.tempId)
  );
  emit('update:pendingImages', newPendingImages);
  URL.revokeObjectURL(imageToRemove.previewUrl); // 立即释放内存

  // 2. 如果图片已经上传成功（有真实ID），才通知服务器删除
  if (imageToRemove.id) {
    Request.delete(`/images/${imageToRemove.id}`).then(() => {
      snackbar.success(`图片 '${imageToRemove.fileName}' 已成功移除。`);
    }).catch(() => {
      // 即使后端删除失败，前端也已经移除了，这里只给提示
      snackbar.error(`从服务器移除图片 '${imageToRemove.fileName}' 失败。`);
    });
  } else {
    // 如果图片还在上传中，直接在前端移除即可
    snackbar.success(`已取消上传 '${imageToRemove.fileName}'。`);
  }
};
const beforeDocumentUpload = (file) => {
  const types = ['.pdf', '.txt', '.doc', '.docx', '.xls', '.xlsx'];
  const ext = '.' + file.name.split('.').pop().toLowerCase();
  const isAllowed = types.includes(ext);
  const isLt50M = file.size / 1024 / 1024 < 50;
  if (!isAllowed) snackbar.error(`只能上传 ${types.join(', ')} 格式的文档!`);
  if (!isLt50M) snackbar.error('文档大小不能超过 50MB!');
  return isAllowed && isLt50M;
};


defineExpose({focus: () => inputRef.value?.focus()});
onMounted(() => inputRef.value?.focus());
</script>

<style scoped>
.input-area-wrapper {
  flex-shrink: 0;
  width: 100%;
  max-width: 820px;
  margin: 0 auto;
  padding: 1rem 1rem 1.5rem;
}

.image-preview-area {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.image-preview-card {
  position: relative;
  width: 80px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
}

.preview-thumbnail {
  transition: transform 0.2s ease-in-out;
}

.image-preview-card:hover .preview-thumbnail {
  transform: scale(1.1);
}

.remove-image-button {
  position: absolute;
  top: 4px;
  right: 4px;
  opacity: 0;
  transition: opacity 0.2s ease-in-out;
}

.remove-image-button.show-btn {
  opacity: 1;
}

.add-image-button {
  width: 80px;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed rgb(var(--v-theme-on-surface), 0.3);
  border-radius: 8px;
  cursor: pointer;
  transition: border-color 0.2s, background-color 0.2s;
}

.add-image-button:hover {
  border-color: rgb(var(--v-theme-primary));
  background-color: rgba(var(--v-theme-primary), 0.1);
}

.input-area {
  display: flex;
  align-items: flex-end;
  gap: 8px;
  transition: box-shadow 0.2s;
}

.input-area:focus-within {
  box-shadow: 0 0 0 2px rgba(var(--v-theme-primary), 0.3);
}

.footer-info {
  text-align: center;
  font-size: 0.75rem;
  color: rgb(var(--v-theme-on-surface), 0.6);
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.upload-progress-bar {
  width: 200px;
}

.upload-progress-text {
  font-weight: 500;
  color: rgb(var(--v-theme-primary));
}
</style>