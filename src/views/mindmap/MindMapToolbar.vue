<template>
  <v-app-bar
      color="white"
      elevation="1"
      density="comfortable"
      class="mindmap-header"
  >
    <!-- 搜索框 -->
    <v-text-field
        :model-value="searchKeyword"
        @update:model-value="$emit('update:searchKeyword', $event)"
        placeholder="点此搜索"
        prepend-inner-icon="mdi-magnify"
        variant="outlined"
        density="compact"
        hide-details
        class="search-input mx-4"
        clearable
    />

    <!-- 标题输入 -->
    <v-text-field
        :model-value="title"
        @update:model-value="$emit('update:title', $event)"
        placeholder="请输入思维导图标题"
        variant="plain"
        density="compact"
        hide-details
        class="title-input font-weight-bold"
        @keyup.enter="$emit('save')"
    />

    <v-spacer />

    <!-- 缩放控制 -->
    <v-btn-group variant="outlined" class="mx-2">
      <v-btn
          icon="mdi-magnify-plus"
          @click="$emit('zoomIn')"
          size="small"
      >
        <v-icon>mdi-magnify-plus</v-icon>
        <v-tooltip activator="parent" location="bottom">放大</v-tooltip>
      </v-btn>
      <v-btn
          icon="mdi-magnify-minus"
          @click="$emit('zoomOut')"
          size="small"
      >
        <v-icon>mdi-magnify-minus</v-icon>
        <v-tooltip activator="parent" location="bottom">缩小</v-tooltip>
      </v-btn>
      <v-btn
          icon="mdi-fit-to-page"
          @click="$emit('fitView')"
          size="small"
      >
        <v-icon>mdi-fit-to-page</v-icon>
        <v-tooltip activator="parent" location="bottom">适应画布</v-tooltip>
      </v-btn>
    </v-btn-group>

    <!-- 撤销/重做 -->
    <v-btn-group variant="outlined" class="mx-2">
      <v-btn
          icon="mdi-undo"
          @click="$emit('undo')"
          :disabled="historyIndex === 0"
          size="small"
      >
        <v-icon>mdi-undo</v-icon>
        <v-tooltip activator="parent" location="bottom">撤销</v-tooltip>
      </v-btn>
      <v-btn
          icon="mdi-redo"
          @click="$emit('redo')"
          :disabled="historyIndex >= historyLength - 1"
          size="small"
      >
        <v-icon>mdi-redo</v-icon>
        <v-tooltip activator="parent" location="bottom">重做</v-tooltip>
      </v-btn>
    </v-btn-group>

    <!-- AI 生成按钮 -->
    <v-btn
        color="deep-purple"
        variant="elevated"
        @click="$emit('showAiGeneration')"
        class="mx-2"
        size="small"
    >
      <v-icon start>mdi-magic-staff</v-icon>
      AI生成
      <v-tooltip activator="parent" location="bottom">AI生成导图</v-tooltip>
    </v-btn>

    <!-- 导出菜单 -->
    <v-menu>
      <template v-slot:activator="{ props }">
        <v-btn
            color="success"
            variant="elevated"
            v-bind="props"
            class="mx-2"
            size="small"
        >
          <v-icon start>mdi-download</v-icon>
          导出
          <v-icon end>mdi-chevron-down</v-icon>
        </v-btn>
      </template>
      <v-list>
        <v-list-item @click="$emit('export', 'json')">
          <template v-slot:prepend>
            <v-icon>mdi-code-json</v-icon>
          </template>
          <v-list-item-title>导出为 JSON</v-list-item-title>
        </v-list-item>
        <v-list-item @click="$emit('export', 'png')">
          <template v-slot:prepend>
            <v-icon>mdi-image</v-icon>
          </template>
          <v-list-item-title>导出为 PNG 图片</v-list-item-title>
        </v-list-item>
        <v-list-item @click="$emit('export', 'svg')">
          <template v-slot:prepend>
            <v-icon>mdi-vector-square</v-icon>
          </template>
          <v-list-item-title>导出为 SVG 图片</v-list-item-title>
        </v-list-item>
        <v-divider />
        <v-list-item @click="$emit('export', 'md')">
          <template v-slot:prepend>
            <v-icon>mdi-language-markdown</v-icon>
          </template>
          <v-list-item-title>导出为 Markdown</v-list-item-title>
        </v-list-item>
      </v-list>
    </v-menu>

    <!-- 保存按钮 -->
    <v-btn
        color="primary"
        variant="elevated"
        @click="$emit('save')"
        :loading="isSaving"
        class="mx-2"
        size="small"
    >
      <v-icon start>mdi-content-save</v-icon>
      {{ isSaving ? '保存中...' : '保存导图' }}
    </v-btn>
  </v-app-bar>
</template>

<script setup>
defineProps({
  title: {
    type: String,
    default: ''
  },
  searchKeyword: {
    type: String,
    default: ''
  },
  isSaving: {
    type: Boolean,
    default: false
  },
  historyIndex: {
    type: Number,
    default: 0
  },
  historyLength: {
    type: Number,
    default: 0
  }
});

defineEmits([
  'update:title',
  'update:searchKeyword',
  'zoomIn',
  'zoomOut',
  'fitView',
  'undo',
  'redo',
  'showAiGeneration',
  'export',
  'save'
]);
</script>

<style scoped>
.search-input {
  max-width: 200px;
}

.title-input {
  max-width: 300px;
}
</style>