<template>
  <v-app>
    <v-main>
      <router-view />
    </v-main>

    <!-- 全局 Snackbar 组件 - 优化版本 -->
    <v-snackbar
        v-model="snackbarState.show"
        :color="snackbarState.color"
        :timeout="snackbarState.timeout"
        :location="snackbarState.location"
        :variant="snackbarState.variant"
        :multi-line="snackbarState.multiLine"
        elevation="6"
        rounded="lg"
    >
      <div class="d-flex align-center">
        <!-- 根据不同类型显示不同图标 -->
        <v-icon
            :icon="getSnackbarIcon(snackbarState.color)"
            class="me-3"
            size="20"
        />
        <span class="flex-grow-1">{{ snackbarState.text }}</span>
      </div>

      <template v-slot:actions>
        <v-btn
            variant="text"
            size="small"
            icon="mdi-close"
            @click="hideSnackbar"
        />
      </template>
    </v-snackbar>
  </v-app>
</template>

<script setup>
import { useSnackbar } from '@/utils/Snackbar.js';

const { snackbarState, hideSnackbar } = useSnackbar();

// 根据消息类型返回对应图标
const getSnackbarIcon = (color) => {
  const iconMap = {
    success: 'mdi-check-circle',
    error: 'mdi-alert-circle',
    warning: 'mdi-alert',
    info: 'mdi-information',
  };
  return iconMap[color] || 'mdi-information';
};
</script>

<style>
/* Vuetify 全局样式优化 */
.v-application {
  font-family: 'Inter', 'Roboto', sans-serif;
}

/* Snackbar 样式优化 */
.v-snackbar {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

.v-snackbar .v-snackbar__wrapper {
  min-width: 300px;
  max-width: 500px;
}

/* 响应式字体大小 */
@media (max-width: 600px) {
  .v-snackbar .v-snackbar__wrapper {
    min-width: 280px;
    font-size: 14px;
  }
}
</style>