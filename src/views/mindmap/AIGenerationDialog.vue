<template>
  <v-dialog
      :model-value="show"
      @update:model-value="$emit('update:show', $event)"
      max-width="600px"
      persistent
  >
    <v-card rounded="xl">
      <v-card-title class="d-flex align-center">
        <v-icon color="deep-purple" class="mr-3">mdi-magic-staff</v-icon>
        <span class="text-h5">从文本生成思维导图</span>
      </v-card-title>

      <v-card-text>
        <v-textarea
            :model-value="text"
            @update:model-value="$emit('update:text', $event)"
            label="输入文本内容"
            placeholder="请输入用于生成思维导图的文本内容，例如会议纪要、文章摘要、聊天记录等。支持多种格式：

• 纯文本
• 要点列表
• 结构化内容
• 会议记录
• 学习笔记

AI将自动分析内容结构，生成层次化的思维导图。"
            rows="12"
            variant="outlined"
            counter
            no-resize
        />

        <v-alert
            v-if="!text.trim() && attemptedGenerate"
            type="warning"
            variant="tonal"
            class="mt-3"
        >
          请输入要生成思维导图的文本内容
        </v-alert>
      </v-card-text>

      <v-card-actions class="px-6 pb-6">
        <v-btn
            variant="text"
            @click="handleCancel"
            :disabled="isGenerating"
        >
          取消
        </v-btn>

        <v-spacer />

        <v-btn
            color="deep-purple"
            variant="elevated"
            @click="handleGenerate"
            :loading="isGenerating"
            :disabled="!text.trim()"
        >
          <v-icon start>mdi-creation</v-icon>
          {{ isGenerating ? '生成中...' : '开始生成' }}
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  text: {
    type: String,
    default: ''
  },
  isGenerating: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'update:show',
  'update:text',
  'generate'
]);

const attemptedGenerate = ref(false);

const handleGenerate = () => {
  if (!props.text.trim()) {
    attemptedGenerate.value = true;
    return;
  }
  emit('generate');
};

const handleCancel = () => {
  emit('update:show', false);
  attemptedGenerate.value = false;
};

// 重置警告状态
watch(() => props.show, (newVal) => {
  if (!newVal) {
    attemptedGenerate.value = false;
  }
});

watch(() => props.text, () => {
  if (attemptedGenerate.value && props.text.trim()) {
    attemptedGenerate.value = false;
  }
});
</script>

<style scoped>
/* 可以在这里添加对话框的自定义样式 */
</style>