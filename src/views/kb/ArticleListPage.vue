<template>
  <!-- 1. 使用 v-container 提供标准化的内边距和布局 -->
  <v-container fluid class="article-list-page pa-6 pa-md-8">
    <!-- 2. 加载状态: 使用 v-overlay 提供一个非侵入式的加载遮罩 -->
    <v-overlay
        :model-value="kbStore.loading.list"
        class="align-center justify-center"
        persistent
    >
      <v-progress-circular indeterminate color="white" size="64"/>
    </v-overlay>

    <!-- 3. 页面标题: 使用 Vuetify 的排版辅助类 -->
    <h2 class="text-h4 font-weight-bold mb-6">{{ kbStore.pageTitle }}</h2>

    <!-- 4. 列表: 使用 v-list 和 v-list-item 替代自定义 div 布局 -->
    <v-list v-if="kbStore.articles.length > 0" lines="two" class="py-0 bg-transparent">
      <v-hover v-for="article in kbStore.articles" :key="article.id" v-slot="{ isHovering, props }">
        <v-list-item
            v-bind="props"
            :elevation="isHovering ? 2 : 0"
            class="mb-2 border rounded-lg pa-4"
            @click="goToDetail(article)"
        >
          <template v-slot:prepend>
            <v-avatar color="primary" rounded="lg" class="me-4">
              <v-icon>mdi-file-document-outline</v-icon>
            </v-avatar>
          </template>

          <v-list-item-title class="font-weight-bold mb-1">{{ article.title }}</v-list-item-title>

          <v-list-item-subtitle class="d-flex align-center flex-wrap ga-3">
            <span>{{ formatFileSize(article.fileSize) }}</span>
            <v-divider v-if="article.tags && article.tags.length" vertical/>
            <div class="d-flex ga-1">
              <v-chip v-for="tag in article.tags" :key="tag" size="x-small">{{ tag }}</v-chip>
            </div>
            <v-divider vertical/>
            <span>更新于 {{ article.updateTime }}</span>
          </v-list-item-subtitle>

          <template v-slot:append>
            <div class="d-flex align-center" :class="{ 'opacity-0': !isHovering }" style="transition: opacity 0.2s ease;">
              <v-btn variant="text" color="primary" size="small" @click.stop="handleEdit(article)">编辑</v-btn>
              <!-- 5. 删除确认: 点击按钮打开一个 v-dialog，而不是 el-popconfirm -->
              <v-btn variant="text" color="error" size="small" @click.stop="openDeleteConfirm(article)">删除</v-btn>
            </div>
          </template>
        </v-list-item>
      </v-hover>
    </v-list>

    <!-- 6. 空状态: 自定义空状态，更符合 Vuetify 风格 -->
    <div v-else-if="!kbStore.loading.list" class="d-flex flex-column align-center justify-center fill-height text-medium-emphasis mt-16">
      <v-icon icon="mdi-database-off-outline" size="80"/>
      <div class="mt-4 text-h6">暂无文档</div>
    </div>

    <!-- 7. 分页: Vuetify 的分页通常由 v-pagination 和一个独立的 v-select 组合而成 -->
    <div v-if="kbStore.total > 0" class="d-flex align-center justify-end flex-wrap ga-4 mt-6">
      <div class="text-caption text-disabled">共 {{ kbStore.total }} 项</div>
      <v-select
          :model-value="kbStore.queryParams.PageSize"
          @update:model-value="handleSizeChange"
          :items="[10, 20, 50]"
          label="每页"
          variant="outlined"
          density="compact"
          hide-details
          style="max-width: 120px;"
      />
      <v-pagination
          :model-value="kbStore.queryParams.PageNumber"
          @update:model-value="handlePageChange"
          :length="pageCount"
          :total-visible="7"
          rounded="circle"
          density="compact"
      />
    </div>

    <!-- 编辑对话框保持不变，它的 API 是 v-model 和事件 -->
    <ArticleEditDialog v-model="editDialogVisible" :article-id="currentArticleId" @updated="kbStore.fetchArticles"/>

    <!-- 8. 删除确认对话框 -->
    <v-dialog v-model="deleteDialog.visible" max-width="400" persistent>
      <v-card>
        <v-card-title class="text-h5">
          <v-icon color="warning" class="me-2">mdi-alert-circle-outline</v-icon>
          确认删除
        </v-card-title>
        <v-card-text>
          您确定要删除文档
          <strong class="mx-1">"{{ deleteDialog.item?.title }}"</strong>
          吗？此操作不可撤销。
        </v-card-text>
        <v-card-actions>
          <v-spacer/>
          <v-btn variant="text" @click="closeDeleteConfirm">取消</v-btn>
          <v-btn color="error" variant="flat" @click="confirmDelete">确认删除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-container>
</template>

<script setup>
import {ref, watch, computed, reactive} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import {useKnowledgeBaseStore} from '@/stores/knowledgebase';
import ArticleEditDialog from './ArticleEditDialog.vue';

const route = useRoute();
const router = useRouter();
const kbStore = useKnowledgeBaseStore();

const editDialogVisible = ref(false);
const currentArticleId = ref(null);

// 删除确认对话框的状态
const deleteDialog = reactive({
  visible: false,
  item: null
});

// 计算总页数
const pageCount = computed(() => {
  if (kbStore.total === 0 || kbStore.queryParams.PageSize === 0) return 0;
  return Math.ceil(kbStore.total / kbStore.queryParams.PageSize);
});

const handleEdit = (article) => {
  currentArticleId.value = article.id;
  editDialogVisible.value = true;
};

const goToDetail = (article) => {
  router.push(`/kb/article/${article.id}`);
};

// 分页处理
const handleSizeChange = (size) => {
  kbStore.queryParams.PageSize = size;
  kbStore.queryParams.PageNumber = 1; // 切换每页数量时，通常回到第一页
  kbStore.fetchArticles();
};
const handlePageChange = (page) => {
  kbStore.queryParams.PageNumber = page;
  kbStore.fetchArticles();
};

// 删除流程
const openDeleteConfirm = (article) => {
  deleteDialog.item = article;
  deleteDialog.visible = true;
};
const closeDeleteConfirm = () => {
  deleteDialog.visible = false;
  deleteDialog.item = null;
};
const confirmDelete = () => {
  if (deleteDialog.item) {
    // API 调用现在由 store 处理
    kbStore.deleteArticle(deleteDialog.item.id);
  }
  closeDeleteConfirm();
};

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 KB';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

// 监听路由查询参数变化，委托 store 处理数据更新
watch(
    () => route.query,
    (newQuery) => {
      kbStore.updateFromRoute(newQuery);
    },
    {immediate: true, deep: true}
);
import {onActivated} from "vue";
onActivated(()=>{
  kbStore.fetchArticles();
})
</script>

<style scoped>
/* Vuetify 的组件和辅助类处理了大部分样式，几乎不需要自定义 CSS */
.article-list-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 优化列表项操作按钮的悬浮显示效果 */
.v-list-item .v-list-item__append .opacity-0 {
  opacity: 0;
}
</style>