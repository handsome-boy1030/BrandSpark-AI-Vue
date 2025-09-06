<template>
  <v-card
      class="floating-toolbar elevation-8"
      rounded="lg"
  >
    <v-card-text class="pa-3">
      <div class="d-flex align-center">
        <v-text-field
            :model-value="editingLabel"
            @update:model-value="$emit('update:editingLabel', $event)"
            placeholder="编辑节点文本"
            variant="outlined"
            density="compact"
            hide-details
            class="floating-edit-input"
            @keyup.enter="$emit('blurEdit')"
            @blur="$emit('blurEdit')"
            ref="nodeEditInputRef"
        />

        <v-btn-group variant="text" class="ml-3">
          <v-btn
              icon="mdi-plus"
              @click="$emit('addNode', selectedNodeId, 'right')"
              size="small"
              color="primary"
          >
            <v-icon>mdi-plus</v-icon>
            <v-tooltip activator="parent" location="bottom">添加子节点</v-tooltip>
          </v-btn>

          <v-btn
              icon="mdi-content-copy"
              @click="$emit('addBrother', selectedNodeId)"
              size="small"
              color="info"
          >
            <v-icon>mdi-content-copy</v-icon>
            <v-tooltip activator="parent" location="bottom">添加同级节点</v-tooltip>
          </v-btn>

          <v-btn
              icon="mdi-delete"
              @click="$emit('deleteNode', selectedNodeId)"
              size="small"
              color="error"
          >
            <v-icon>mdi-delete</v-icon>
            <v-tooltip activator="parent" location="bottom">删除节点</v-tooltip>
          </v-btn>

          <v-btn
              icon="mdi-brain"
              @click="$emit('expandNode')"
              :loading="isExpanding"
              :disabled="!hasMindmap"
              size="small"
              color="deep-purple"
          >
            <v-icon>mdi-brain</v-icon>
            <v-tooltip activator="parent" location="bottom">
              {{ isExpanding ? '扩展中...' : 'AI扩展节点' }}
            </v-tooltip>
          </v-btn>
        </v-btn-group>
      </div>
    </v-card-text>
  </v-card>
</template>

<script setup>
import { ref, onMounted, nextTick } from 'vue';

defineProps({
  editingLabel: {
    type: String,
    default: ''
  },
  selectedNodeId: {
    type: String,
    default: null
  },
  isExpanding: {
    type: Boolean,
    default: false
  },
  hasMindmap: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits([
  'update:editingLabel',
  'addNode',
  'addBrother',
  'deleteNode',
  'expandNode',
  'blurEdit'
]);

const nodeEditInputRef = ref(null);

// 暴露方法给父组件
const focusInput = () => {
  nextTick(() => {
    if (nodeEditInputRef.value) {
      nodeEditInputRef.value.focus();
    }
  });
};

defineExpose({
  focusInput
});

onMounted(() => {
  focusInput();
});
</script>

<style scoped>
.floating-toolbar {
  position: fixed;
  z-index: 999;
  min-width: 350px;
}

.floating-edit-input {
  min-width: 200px;
}
</style>