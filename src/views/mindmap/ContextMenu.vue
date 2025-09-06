<template>
  <v-menu
      :model-value="show"
      @update:model-value="$emit('update:show', $event)"
      :position-x="position.x"
      :position-y="position.y"
      absolute
      offset-y
  >
    <v-list density="compact">
      <!-- 针对根节点的特殊菜单项 -->
      <template v-if="targetIsRoot">
        <v-list-item @click="handleAddChild('left')">
          <template v-slot:prepend>
            <v-icon>mdi-plus</v-icon>
          </template>
          <v-list-item-title>添加左分支</v-list-item-title>
        </v-list-item>
        <v-list-item @click="handleAddChild('right')">
          <template v-slot:prepend>
            <v-icon>mdi-plus</v-icon>
          </template>
          <v-list-item-title>添加右分支</v-list-item-title>
        </v-list-item>
      </template>

      <!-- 针对非根节点的通用菜单项 -->
      <template v-else>
        <v-list-item @click="handleAddChild()">
          <template v-slot:prepend>
            <v-icon>mdi-plus</v-icon>
          </template>
          <v-list-item-title>添加子节点</v-list-item-title>
        </v-list-item>
        <v-list-item @click="handleAddBrother()">
          <template v-slot:prepend>
            <v-icon>mdi-content-copy</v-icon>
          </template>
          <v-list-item-title>添加同级节点</v-list-item-title>
        </v-list-item>
        <v-list-item @click="handleDelete()">
          <template v-slot:prepend>
            <v-icon>mdi-delete</v-icon>
          </template>
          <v-list-item-title>删除节点</v-list-item-title>
        </v-list-item>
      </template>

      <v-divider />

      <v-list-item @click="handleUndo()" :disabled="historyIndex === 0">
        <template v-slot:prepend>
          <v-icon>mdi-undo</v-icon>
        </template>
        <v-list-item-title>撤销</v-list-item-title>
      </v-list-item>
      <v-list-item @click="handleRedo()" :disabled="historyIndex >= historyLength - 1">
        <template v-slot:prepend>
          <v-icon>mdi-redo</v-icon>
        </template>
        <v-list-item-title>重做</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup>
defineProps({
  show: {
    type: Boolean,
    default: false
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  },
  targetIsRoot: {
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

const emit = defineEmits([
  'update:show',
  'addChild',
  'addBrother',
  'delete',
  'undo',
  'redo'
]);

const handleAddChild = (side) => {
  emit('addChild', side);
  emit('update:show', false);
};

const handleAddBrother = () => {
  emit('addBrother');
  emit('update:show', false);
};

const handleDelete = () => {
  emit('delete');
  emit('update:show', false);
};

const handleUndo = () => {
  emit('undo');
  emit('update:show', false);
};

const handleRedo = () => {
  emit('redo');
  emit('update:show', false);
};
</script>

<style scoped>
</style>