<template>
  <!-- 1. 使用 v-dialog 替代 el-dialog -->
  <v-dialog
      :model-value="modelValue"
      @update:model-value="closeDialog"
      max-width="600px"
      persistent
  >
    <!-- 使用 v-card 作为对话框内容容器，并集成加载状态 -->
    <v-card :loading="loading" :disabled="loading">
      <v-card-title class="pa-4 border-b">
        <span class="text-h5">编辑文章信息</span>
      </v-card-title>

      <v-card-text class="py-4">
        <!-- 2. 使用 v-form 替代 el-form -->
        <v-form ref="formRef" @submit.prevent="submitForm">
          <!-- 3. 使用 v-text-field 替代 el-input -->
          <v-text-field
              v-model="form.title"
              :rules="[rules.required]"
              label="标题"
              placeholder="请输入文章标题"
              variant="outlined"
              density="compact"
              class="mb-4"
          />

          <!-- 4. 使用 v-combobox 替代 el-select (allow-create 功能) -->
          <!-- chips 属性可以将选中的标签显示为漂亮的药丸状 -->
          <v-combobox
              v-model="form.tags"
              :items="kbStore.allTags"
              :loading="kbStore.loading.tags"
              label="标签"
              placeholder="请选择或创建新标签"
              variant="outlined"
              density="compact"
              multiple
              chips
              clearable
              closable-chips
              class="mb-4"
          />

          <!-- 5. 使用 v-textarea 替代 el-input type="textarea" -->
          <v-textarea
              v-model="form.description"
              label="描述"
              placeholder="请输入文章的简要描述或摘要"
              variant="outlined"
              density="compact"
              rows="4"
              no-resize
          />
        </v-form>
      </v-card-text>

      <v-divider/>

      <v-card-actions class="pa-4">
        <v-spacer/>
        <v-btn
            variant="text"
            @click="closeDialog"
        >
          取消
        </v-btn>
        <v-btn
            color="primary"
            variant="flat"
            @click="submitForm"
            :loading="loading"
        >
          保存
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import {ref, reactive, watch} from 'vue';
import {snackbar} from '@/utils/Snackbar.js';
import KbApi from '@/api/knowledgebase.js';
import {useKnowledgeBaseStore} from '@/stores/knowledgebase';

const props = defineProps({
  modelValue: Boolean,
  articleId: {type: [Number, String], default: null}
});
const emit = defineEmits(['update:modelValue', 'updated']);

const kbStore = useKnowledgeBaseStore();
const formRef = ref(null);
const loading = ref(false);

const form = reactive({
  title: '',
  description: '',
  tags: []
});

// Vuetify 的表单验证规则，更简洁
const rules = {
  required: value => !!value || '此项为必填项',
};

// API 调用：获取文章详情以填充表单
const fetchArticleDetail = () => {
  if (!props.articleId) return;
  loading.value = true;
  // API 调用本身保持不变
  KbApi.getArticleDetail(props.articleId)
      .then(response => {
        const data = response.data;
        form.title = data.title;
        form.description = data.summary;
        form.tags = data.tags || [];
      })
      .catch(error => {
        // 错误提示已由 Axios 拦截器统一处理
        console.error("获取文章详情失败:", error);
        closeDialog();
      })
      .finally(() => {
        loading.value = false;
      });
};

// API 调用：提交表单
const submitForm = async () => {
  // Vuetify 的表单验证是异步的，需要使用 async/await
  const {valid} = await formRef.value.validate();

  if (valid) {
    loading.value = true;
    const dataToUpdate = {
      title: form.title,
      description: form.description,
      tags: form.tags
    };
    // API 调用本身保持不变
    KbApi.updateArticle(props.articleId, dataToUpdate)
        .then(() => {
          snackbar.success('更新成功！');
          emit('updated');
          kbStore.fetchAllTags(true); // 强制刷新全局标签列表
          closeDialog();
        })
        .catch(error => {
          console.error("更新失败:", error);
          // 错误提示已由 Axios 拦截器统一处理
        })
        .finally(() => {
          loading.value = false;
        });
  } else {
    snackbar.warning('请检查表单填写是否正确');
  }
};

const closeDialog = () => {
  emit('update:modelValue', false);
};

// 使用 watch 替代 @open 和 @closed 事件，这是 Vue 3 的推荐做法
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    // 对话框打开时
    fetchArticleDetail();
  } else {
    // 对话框关闭后，重置表单和验证状态
    if (formRef.value) {
      formRef.value.reset();
      formRef.value.resetValidation();
    }
  }
});
</script>

<style scoped>
</style>