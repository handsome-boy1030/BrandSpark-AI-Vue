<template>
  <div v-if="files && files.length > 0" class="file-display-container">
    <div class="file-list">
      <!-- 1. 图片文件列表 -->
      <div v-for="(file, index) in imageFiles" :key="file.id" class="file-card-wrapper">
        <v-hover v-slot="{ isHovering, props }">
          <v-card v-bind="props" class="file-card" @click="openImagePreview(index)">
            <v-img :src="getFullUrl(file.url)" aspect-ratio="1" cover />
            <v-btn
                v-show="isHovering"
                icon="mdi-close"
                size="x-small"
                color="black"
                class="delete-button"
                @click.stop="$emit('delete', file)"
            />
          </v-card>
        </v-hover>
      </div>

      <!-- 2. 文档文件列表 -->
      <div v-for="file in documentFiles" :key="file.id" class="file-card-wrapper">
        <v-hover v-slot="{ isHovering, props }">
          <v-card v-bind="props" class="file-card document-card" @click="handleDocumentClick(file)">
            <div class="file-info">
              <div class="file-icon" v-html="getFileIcon(file.fileName)" />
              <div class="file-details">
                <span class="file-name" :title="file.fileName">{{ file.fileName }}</span>
                <span class="file-meta">{{ getFileType(file.fileName) }} | {{ formatFileSize(file.fileSize) }}</span>
              </div>
            </div>
            <v-btn
                v-show="isHovering"
                icon="mdi-close"
                size="x-small"
                color="black"
                class="delete-button"
                @click.stop="$emit('delete', file)"
            />
          </v-card>
        </v-hover>
      </div>
    </div>
  </div>

  <!-- 3. 自定义图片预览 Overlay -->
  <v-overlay v-model="imagePreview.visible" class="image-preview-overlay" content-class="d-flex align-center justify-center">
    <div class="d-flex align-center" style="height: 100%;">
      <v-btn icon="mdi-chevron-left" variant="text" size="x-large" @click="prevImage" :disabled="!canGoPrev" />
      <v-img
          :src="imagePreview.currentSrc"
          contain
          max-height="90vh"
          max-width="90vw"
          class="previewed-image"
      />
      <v-btn icon="mdi-chevron-right" variant="text" size="x-large" @click="nextImage" :disabled="!canGoNext" />
    </div>
    <v-btn icon="mdi-close" variant="text" class="close-preview-btn" @click="closeImagePreview" />
  </v-overlay>

  <!-- 4. 文档预览 Dialog -->
  <v-dialog v-model="previewDialog.visible" fullscreen transition="dialog-bottom-transition">
    <v-card>
      <v-toolbar color="primary">
        <v-toolbar-title>{{ previewDialog.title }}</v-toolbar-title>
        <v-spacer />
        <v-btn icon="mdi-close" @click="previewDialog.visible = false" />
      </v-toolbar>
      <iframe :src="previewDialog.url" class="preview-iframe" />
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { snackbar } from '@/utils/Snackbar.js';

const props = defineProps({
  files: { type: Array, required: true },
});
defineEmits(['delete']);

// --- 状态管理 ---
const imagePreview = reactive({
  visible: false,
  currentIndex: 0,
  currentSrc: '',
});
const previewDialog = reactive({
  visible: false,
  url: '',
  title: '',
});

// --- Computed Properties ---
const imageFiles = computed(() => props.files.filter(f => f.type === 'image'));
const documentFiles = computed(() => props.files.filter(f => f.type === 'document'));
const canGoPrev = computed(() => imagePreview.currentIndex > 0);
const canGoNext = computed(() => imagePreview.currentIndex < imageFiles.value.length - 1);

// --- 图片预览逻辑 ---
const openImagePreview = (index) => {
  imagePreview.currentIndex = index;
  imagePreview.currentSrc = getFullUrl(imageFiles.value[index].url);
  imagePreview.visible = true;
};
const closeImagePreview = () => {
  imagePreview.visible = false;
};
const prevImage = () => {
  if (canGoPrev.value) {
    imagePreview.currentIndex--;
    imagePreview.currentSrc = getFullUrl(imageFiles.value[imagePreview.currentIndex].url);
  }
};
const nextImage = () => {
  if (canGoNext.value) {
    imagePreview.currentIndex++;
    imagePreview.currentSrc = getFullUrl(imageFiles.value[imagePreview.currentIndex].url);
  }
};

// --- 文档预览逻辑 ---
const handleDocumentClick = (file) => {
  const ext = file.fileName.split('.').pop().toLowerCase();
  const previewEndpoint = `/documents/preview/${file.id}`;

  if (['docx', 'doc', 'xlsx', 'xls'].includes(ext)) {
    snackbar.info('Office文档暂不支持内嵌预览，将尝试在新标签页打开。');
    window.open(getFullUrl(previewEndpoint), '_blank');
    return;
  }

  previewDialog.url = getFullUrl(previewEndpoint);
  previewDialog.title = file.fileName;
  previewDialog.visible = true;
};

// --- Helper Functions (保持不变) ---
const getFullUrl = (relativeUrl) => {
  if (!relativeUrl || /^(https?|blob):/i.test(relativeUrl)) return relativeUrl;
  return `${import.meta.env.VITE_APP_API_BASE_URL || ''}${relativeUrl}`;
};

const icons = { /* ... a large SVG object ... */ }; // (Keep the original SVG icons object)
const getFileIcon = (fileName) => {
  const ext = fileName.split('.').pop().toLowerCase();
  if (['doc', 'docx'].includes(ext)) return icons.docx;
  if (['xls', 'xlsx'].includes(ext)) return icons.xlsx;
  if (ext === 'pdf') return icons.pdf;
  if (ext === 'txt') return icons.txt;
  return icons.default;
};
const getFileType = (fileName) => {
  const ext = fileName.split('.').pop();
  return ext ? ext.toUpperCase() : 'FILE';
};
const formatFileSize = (bytes) => {
  if (!bytes) return '0 Bytes';
  const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'], i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
</script>

<style scoped>
.file-display-container {
  padding: 0 1rem;
  max-width: 820px;
  margin: 0 auto 10px;
}

.file-list {
  display: flex;
  overflow-x: auto;
  gap: 16px;
  padding-bottom: 10px;
}

/* Webkit scrollbar styles */
.file-list::-webkit-scrollbar { height: 6px; }
.file-list::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 3px; }
.file-list::-webkit-scrollbar-thumb { background: #ccc; border-radius: 3px; }

.file-card-wrapper {
  flex-shrink: 0;
  width: 100px;
  position: relative;
}

.file-card {
  width: 100%;
  height: 80px;
  border-radius: 8px;
  cursor: pointer;
  overflow: hidden;
}
.document-card {
  display: flex;
  align-items: center;
  justify-content: center;
}

.file-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.file-icon { width: 32px; height: 32px; flex-shrink: 0; }
.file-details { text-align: center; width: 100%; }
.file-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  font-weight: 500;
  display: block;
  width: 90px;
  margin-top: 4px;
}
.file-meta { font-size: 11px; opacity: 0.7; }

.delete-button {
  position: absolute;
  top: 4px;
  right: 4px;
  z-index: 10;
}

.image-preview-overlay {
  backdrop-filter: blur(4px);
  background: rgba(0,0,0,0.7);
}
.previewed-image {
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
}
.close-preview-btn {
  position: absolute;
  top: 16px;
  right: 16px;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}
</style>