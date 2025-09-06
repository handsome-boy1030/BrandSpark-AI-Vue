<template>
  <!-- 1. 使用 Vuetify 布局组件，它会处理好侧边栏和主内容区的尺寸关系 -->
  <v-layout class="kb-layout">
    <!-- 2. 侧边栏: v-navigation-drawer 替代 aside 和 el-scrollbar -->
    <v-navigation-drawer permanent width="260">
      <!-- 头部：搜索框和上传按钮 -->
      <div class="pa-4">
        <v-text-field
            v-model="localSearchText"
            placeholder="搜索知识库..."
            prepend-inner-icon="mdi-magnify"
            variant="solo-filled"
            flat
            density="compact"
            hide-details
            @keyup.enter="handleGlobalSearch"
            class="mb-4"
        />
        <v-btn
            color="primary"
            variant="flat"
            prepend-icon="mdi-upload"
            @click="kbStore.openUploadDialog"
            block
        >
          上传文档
        </v-btn>
      </div>

      <v-divider/>

      <!-- 3. 导航菜单: v-list 替代 el-menu，:to 属性自动处理路由和激活状态 -->
      <v-list nav density="compact">
        <v-list-item
            to="/kb/list"
            prepend-icon="mdi-format-list-bulleted"
            title="所有文档"
            rounded="xl"
        />

        <!-- 4. 标签子菜单: v-list-group 替代 el-sub-menu -->
        <v-list-group value="Tags">
          <template v-slot:activator="{ props }">
            <v-list-item
                v-bind="props"
                prepend-icon="mdi-tag-multiple-outline"
                title="标签"
                rounded="xl"
            />
          </template>

          <v-list-item
              v-for="tag in kbStore.allTags"
              :key="tag"
              :to="`/kb/list?tag=${encodeURIComponent(tag)}`"
              :title="tag"
              rounded="xl"
              density="compact"
              class="ml-2"
          />
          <v-list-item
              v-if="!kbStore.loading.tags && kbStore.allTags.length === 0"
              title="暂无标签"
              disabled
              density="compact"
              class="ml-2"
          />
        </v-list-group>
      </v-list>
    </v-navigation-drawer>

    <!-- 5. 主内容区: v-main 会自动填充剩余空间 -->
    <v-main class="kb-main-content">
      <router-view v-slot="{ Component, route }">
        <transition name="fade" mode="out-in">
          <component :is="Component" :key="route.fullPath"/>
        </transition>
      </router-view>
    </v-main>

    <!-- 6. 全局上传对话框: v-dialog 替代 el-dialog -->
    <v-dialog
        v-model="kbStore.uploadDialogVisible"
        max-width="500px"
        @update:model-value="!$event && kbStore.closeUploadDialog()"
    >
      <v-card>
        <v-card-title>上传新知识</v-card-title>
        <v-card-text>
          <!-- 7. 自定义上传组件，提供更好的视觉和交互体验 -->
          <div
              class="upload-dropzone"
              @click="triggerFileInput"
              @dragover.prevent
              @dragleave.prevent
              @drop.prevent="handleFileDrop"
          >
            <v-icon size="64" color="grey-lighten-1">mdi-cloud-upload-outline</v-icon>
            <div class="text-h6 text-grey-darken-1 mt-2">将文件拖到此处，或<span class="text-primary font-weight-bold">点击上传</span></div>
            <input
                ref="fileInputRef"
                type="file"
                hidden
                @change="handleFileSelect"
            >
          </div>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-layout>
</template>

<script setup>
import {ref, onMounted} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {useKnowledgeBaseStore} from '@/stores/knowledgebase';
import {snackbar} from '@/utils/Snackbar.js';

const route = useRoute();
const router = useRouter();
const kbStore = useKnowledgeBaseStore();

const localSearchText = ref('');
const fileInputRef = ref(null);

// 全局搜索逻辑保持不变
const handleGlobalSearch = () => {
  if (!localSearchText.value.trim()) {
    router.push({ path: '/kb/list' });
    return;
  }
  router.push({path: '/kb/list', query: {q: localSearchText.value}});
};

// === 上传逻辑，适配新的自定义上传组件 ===
const processFile = (file) => {
  if (!file) return;

  if (beforeUpload(file)) {
    const formData = new FormData();
    formData.append('File', file);
    formData.append('IsKnowledgeArticle', true);
    kbStore.handleUpload(formData); // 调用 store action，store 内部应处理加载状态和关闭对话框
  }
};

const handleFileDrop = (event) => {
  const droppedFile = event.dataTransfer.files[0];
  processFile(droppedFile);
};

const handleFileSelect = (event) => {
  const selectedFile = event.target.files[0];
  processFile(selectedFile);
  event.target.value = ''; // 重置 input，以便可以再次上传同名文件
};

const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const beforeUpload = (file) => {
  // 在这里可以进行更详细的文件验证
  const isLt50M = file.size / 1024 / 1024 < 50;
  if (!isLt50M) {
    snackbar.error('上传文件大小不能超过 50MB!');
  }
  return isLt50M;
};

// 组件挂载时获取初始数据
onMounted(() => {
  kbStore.fetchAllTags();
});
</script>

<style scoped>
/* Vuetify 布局组件非常强大，几乎不需要自定义样式 */
.kb-layout {
  height: 100%;
}

.kb-main-content {
  position: relative; /* 确保 transition 生效 */
  height: 100vh;
  overflow-y: auto;
}

/* 自定义上传组件的样式 */
.upload-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  border: 2px dashed #ccc;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.upload-dropzone:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
  border-color: rgb(var(--v-theme-primary));
}

/* 页面过渡动画 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>