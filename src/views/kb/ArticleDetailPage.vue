<template>
  <!-- 1. 加载状态: 使用 v-progress-circular 实现更平滑的加载动画 -->
  <div v-if="loading" class="d-flex flex-column align-center justify-center fill-height text-medium-emphasis">
    <v-progress-circular indeterminate color="primary" size="64"/>
    <div class="mt-4 text-h6">加载中...</div>
  </div>

  <!-- 2. 主内容区: 使用 v-sheet 和 v-card 组织布局 -->
  <div v-else-if="article" class="d-flex flex-column fill-height">
    <!-- 顶部操作栏: 使用 v-app-bar 或 v-toolbar 替代 header -->
    <v-toolbar density="compact" flat border>
      <v-breadcrumbs :items="breadcrumbs" class="pa-0 ms-2">
        <template v-slot:divider>
          <v-icon icon="mdi-chevron-right"/>
        </template>
      </v-breadcrumbs>

      <v-spacer/>

      <v-btn
          variant="text"
          color="primary"
          prepend-icon="mdi-pencil"
          @click="editDialogVisible = true"
          size="small"
      >
        编辑
      </v-btn>

      <v-divider vertical inset class="mx-1"/>

      <!-- 使用 v-menu 替代 el-dropdown -->
      <v-menu location="bottom end">
        <template v-slot:activator="{ props }">
          <v-btn
              v-bind="props"
              icon="mdi-dots-vertical"
              variant="text"
              size="small"
          />
        </template>
        <v-list density="compact">
          <v-list-item @click="downloadFile" prepend-icon="mdi-download" title="下载源文件"/>
        </v-list>
      </v-menu>
    </v-toolbar>

    <!-- 内容区: 使用 v-container 和 v-card 提升视觉层次感 -->
    <v-main class="detail-content">
      <v-container>
        <v-card flat border class="content-card mx-auto">
          <v-card-text class="pa-8 pa-md-12">
            <h1 class="text-h4 font-weight-bold mb-4">{{ article.title }}</h1>
            <div class="d-flex align-center flex-wrap ga-2 mb-6">
              <!-- 使用 v-chip 替代 el-tag -->
              <v-chip
                  v-for="tag in article.tags"
                  :key="tag"
                  variant="outlined"
                  size="small"
              >
                {{ tag }}
              </v-chip>
              <span class="text-caption text-medium-emphasis">更新于 {{ article.updateTime }}</span>
            </div>

            <v-divider/>

            <!-- 内容展示区: 使用 v-sheet 创造一个代码块/引用块的视觉效果 -->
            <v-sheet
                border
                rounded="lg"
                class="mt-8 pa-6 bg-grey-lighten-5"
            >
              <pre class="article-body">{{ article.content }}</pre>
            </v-sheet>
          </v-card-text>
        </v-card>
      </v-container>
    </v-main>

    <!-- Dialog 组件保持不变，它的 API 是 v-model 和事件 -->
    <ArticleEditDialog v-model="editDialogVisible" :article-id="article.id" @updated="handleUpdateSuccess"/>
  </div>

  <!-- 3. 空状态: 使用 Vuetify 的图标和排版类自定义 -->
  <div v-else class="d-flex flex-column align-center justify-center fill-height text-medium-emphasis">
    <v-icon icon="mdi-file-question-outline" size="80"/>
    <div class="mt-4 text-h6">无法找到该文章</div>
  </div>
</template>

<script setup>
// 1. 从 'vue' 中引入 'watch'
import {ref, onMounted, computed, watch} from 'vue';
import {useRoute} from 'vue-router';
import {snackbar} from '@/utils/Snackbar.js';
import KbApi from '@/api/knowledgebase.js';
import ArticleEditDialog from './ArticleEditDialog.vue';
import {useKnowledgeBaseStore} from '@/stores/knowledgebase';

const route = useRoute();
const kbStore = useKnowledgeBaseStore();
const article = ref(null);
const loading = ref(true);
const editDialogVisible = ref(false);
const previewUrl = ref('');

const breadcrumbs = computed(() => [
  {title: '知识库', to: '/kb/list', disabled: false},
  {title: article.value?.title || '...', disabled: true},
]);

// API 调用：获取文章详情
// 将其修改为接收一个 ID 参数，使其更具可复用性
const fetchArticleDetail = (articleId) => {
  if (!articleId) return; // 如果没有ID则不执行
  loading.value = true;
  article.value = null; // 在加载新文章前先清空旧数据

  KbApi.getArticleDetail(articleId)
      .then(response => {
        article.value = response.data;
        const baseUrl = import.meta.env.VITE_APP_API_BASE_URL || '';
        previewUrl.value = `${baseUrl}${response.data.previewUrl}`;
      })
      .catch((error) => {
        console.error("加载文章详情失败:", error);
        article.value = null;
      })
      .finally(() => {
        loading.value = false;
      });
};

// 更新成功后的回调
const handleUpdateSuccess = () => {
  // 直接使用当前 route.params.id 重新加载数据
  fetchArticleDetail(route.params.id);
  kbStore.fetchAllTags(true);
};

// 下载文件
const downloadFile = () => {
  if (previewUrl.value) {
    window.open(previewUrl.value, '_blank');
  } else {
    snackbar.warning('没有可供下载的源文件。');
  }
};

// 2. 使用 watch 来替代 onMounted
watch(
    () => route.params.id,
    (newId, oldId) => {
      // 只有当 newId 存在时才执行获取操作
      if (newId) {
        fetchArticleDetail(newId);
      }
    },
    {
      // immediate: true 确保了组件在初始加载时就会立即执行一次 watcher
      immediate: true
    }
);

</script>

<style scoped>
/* Vuetify 的组件和辅助类处理了大部分样式，CSS 大大简化 */
.detail-content {
  overflow-y: auto;
  flex-grow: 1;
  background-color: rgb(var(--v-theme-grey-lighten-5)); /* 使用 Vuetify 主题颜色 */
}

/* 确保在亮色主题下，浅灰色背景也能被覆盖 */
.v-theme--light .detail-content {
  background-color: #f5f5f5;
}

.content-card {
  max-width: 960px; /* 适当加宽内容区以获得更好的阅读体验 */
}

.article-body {
  line-height: 1.8;
  color: rgb(var(--v-theme-on-surface));
  font-size: 1rem; /* 调整正文字体，提升可读性 */
  white-space: pre-wrap;
  word-break: break-word;
  font-family: inherit; /* 继承 Vuetify 的全局字体 */
  margin: 0;
}
</style>