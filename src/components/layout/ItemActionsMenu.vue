<template>
  <v-menu location="end">
    <template v-slot:activator="{ props }">
      <v-btn
          v-bind="props"
          icon="mdi-dots-horizontal"
          variant="text"
          size="small"
          @click.prevent.stop
      />
    </template>
    <v-list density="compact">
      <v-list-item title="重命名" @click="$emit('rename')">
        <template v-slot:prepend><v-icon icon="mdi-pencil-outline"/></template>
      </v-list-item>
      <v-list-item title="删除" base-color="error" @click="$emit('delete')">
        <template v-slot:prepend><v-icon icon="mdi-delete-outline"/></template>
      </v-list-item>
    </v-list>
  </v-menu>
</template>

<script setup>
defineEmits(['rename', 'delete']);
</script>