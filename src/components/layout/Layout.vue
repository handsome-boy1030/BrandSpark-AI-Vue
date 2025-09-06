<template>
  <v-app>
    <v-navigation-drawer
        v-model="drawer"
        :rail="isSidebarCollapsed"
        permanent
        class="main-sidebar"
        @update:rail="onRailUpdate"
    >
      <!-- 顶部 Logo 和折叠按钮 -->
      <v-list-item class="sidebar-top" height="64">
        <template v-slot:prepend>
          <v-img
              src="./logo.png"
              width="50"
              height="50"
              class="mb-4 mx-auto"
              contain
          >
          </v-img>
        </template>
        <v-list-item-title class="logo-text">MyAiChat</v-list-item-title>
        <template v-slot:append>
          <v-btn
              variant="text"
              :icon="isSidebarCollapsed ? 'mdi-menu-open' : 'mdi-menu-close'"
              @click.stop="toggleSidebar"
          />
        </template>
      </v-list-item>

      <v-divider/>

      <!-- 统一的 "新建" 菜单 -->
      <div class="pa-2">
        <v-menu location="bottom start" offset="5">
          <template v-slot:activator="{ props }">
            <v-btn v-bind="props" block variant="tonal" class="new-item-menu-btn" size="large">
              <v-icon start>mdi-plus</v-icon>
              <template v-if="!isSidebarCollapsed">新建</template>
            </v-btn>
          </template>
          <v-list density="compact">
            <v-list-item @click="navigateTo('/chat')">
              <template v-slot:prepend>
                <v-icon>mdi-message-text</v-icon>
              </template>
              <v-list-item-title>新对话</v-list-item-title>
            </v-list-item>
            <v-list-item @click="navigateTo('/mindmap')">
              <template v-slot:prepend>
                <v-icon>mdi-sitemap</v-icon>
              </template>
              <v-list-item-title>新导图</v-list-item-title>
            </v-list-item>
            <v-list-item @click="kbStore.openUploadDialog()">
              <template v-slot:prepend>
                <v-icon>mdi-upload</v-icon>
              </template>
              <v-list-item-title>上传文档</v-list-item-title>
            </v-list-item>
          </v-list>
        </v-menu>
      </div>
      <!-- 【优化1】增加始终可见的主导航区域 -->
      <v-list nav density="compact">
        <v-list-item to="/chat" prepend-icon="mdi-message-text-outline" title="聊天" rounded="lg"/>
        <v-list-item to="/mindmap" prepend-icon="mdi-sitemap-outline" title="思维导图" rounded="lg"/>
        <v-list-item to="/kb" prepend-icon="mdi-database-outline" title="知识库" rounded="lg"/>
      </v-list>

      <!-- 历史记录列表 -->
      <v-list v-show="!isSidebarCollapsed" nav density="compact">
        <v-list-subheader class="history-header">历史记录</v-list-subheader>
        <v-list-item
            v-for="item in combinedHistory"
            :key="`${item.type}-${item.id}`"
            :to="`/${item.type}/${item.id}`"
            rounded="lg"
            class="history-item"
        >
          <template v-slot:prepend>
            <v-icon :icon="item.icon" size="small" class="me-3"/>
          </template>
          <v-list-item-title>{{ item.title }}</v-list-item-title>
          <template v-slot:append>
            <ItemActionsMenu @rename="startEditing(item, item.type)" @delete="confirmDeleteItem(item, item.type)"/>
          </template>
        </v-list-item>
      </v-list>

      <v-spacer/>

      <v-spacer/>

      <!-- 底部用户菜单 -->
      <template v-slot:append>
        <v-menu location="top end">
          <template v-slot:activator="{ props }">
            <v-list-item v-bind="props" class="user-profile" lines="false">
              <template v-slot:prepend>
                <v-avatar image="https://cube.elemecdn.com/3/7c/3ea6beec64369c2642b92c6726f1epng.png" size="small"/>
              </template>
              <v-list-item-title v-if="!isSidebarCollapsed">Admin</v-list-item-title>
            </v-list-item>
          </template>

          <v-card min-width="220">
            <v-list>
              <v-list-item title="Admin" subtitle="admin@example.com"/>
              <v-divider/>
              <v-list-item title="切换主题" @click="handleThemeToggle">
                <template v-slot:prepend>
                  <v-icon :icon="themeStore.theme === 'light' ? 'mdi-weather-night' : 'mdi-weather-sunny'"/>
                </template>
                <q1/>
              </v-list-item>
              <v-list-item title="账户设置">
                <template v-slot:prepend>
                  <v-icon icon="mdi-cog-outline"/>
                </template>
              </v-list-item>
              <v-divider/>
              <v-list-item title="退出登录" base-color="error" @click="quitLogin">
                <template v-slot:prepend>
                  <v-icon icon="mdi-logout"/>
                </template>
              </v-list-item>
            </v-list>
          </v-card>
        </v-menu>
      </template>
    </v-navigation-drawer>

    <!-- 主内容区 -->
    <v-main class="main-content">
      <router-view/>
    </v-main>

    <!-- 统一的重命名和删除对话框 -->
    <v-dialog v-model="deleteDialog.visible" max-width="400" persistent>
      <v-card>
        <v-card-title class="text-h5">
          <v-icon color="warning" start>mdi-alert-circle-outline</v-icon>
          确认删除
        </v-card-title>
        <v-card-text>您确定要永久删除 "{{ deleteDialog.item?.title }}" 吗？此操作不可撤销。</v-card-text>
        <v-card-actions>
          <v-spacer/>
          <v-btn text @click="deleteDialog.visible = false">取消</v-btn>
          <v-btn color="error" @click="executeDelete">确认删除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <v-dialog v-model="renameDialog.visible" max-width="400" persistent>
      <v-card>
        <v-card-title>重命名</v-card-title>
        <v-card-text>
          <v-text-field
              v-model="renameDialog.title"
              label="新名称"
              variant="outlined"
              autofocus
              @keydown.enter="executeRename"
          />
        </v-card-text>
        <v-card-actions>
          <v-spacer/>
          <v-btn text @click="renameDialog.visible = false">取消</v-btn>
          <v-btn color="primary" @click="executeRename">保存</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script setup>
import {ref, reactive, onMounted, onUnmounted, watch, computed, defineAsyncComponent} from 'vue';
import {useRoute, useRouter} from 'vue-router';
import Request from "@/utils/Request.js";
import MindMapApi from "@/api/mindmap.js";
import {snackbar} from '@/utils/Snackbar.js';
import {useThemeStore} from '@/stores/theme.js';
import {setToken} from "@/utils/Storage.js";
import {useKnowledgeBaseStore} from "@/stores/knowledgebase.js";
import q1 from "@/components/layout/变化背景.vue"

// === 状态管理 ===
const drawer = ref(true);
const isSidebarCollapsed = ref(false);
const activeTab = ref('chat');
const chatHistory = ref([]);
const mindMapHistory = ref([]);
const deleteDialog = reactive({visible: false, item: null, type: ''});
const renameDialog = reactive({visible: false, item: null, type: '', title: ''});

const router = useRouter();
const route = useRoute();
const themeStore = useThemeStore();
const kbStore = useKnowledgeBaseStore();

// 合并和排序历史记录的计算属性
const combinedHistory = computed(() => {
  const chats = chatHistory.value.map(item => ({
    ...item,
    type: 'chat',
    icon: 'mdi-message-text-outline'
  }));
  const mindmaps = mindMapHistory.value.map(item => ({
    ...item,
    type: 'mindmap',
    icon: 'mdi-sitemap-outline'
  }));

  const allHistory = [...chats, ...mindmaps];
  // 历史记录的updateTime 或 createTime 字段
  // 如果没有，可以按 id 降序排序
  return allHistory.sort((a, b) => {
    const timeA = new Date(a.updateTime || a.createTime || 0);
    const timeB = new Date(b.updateTime || b.createTime || 0);
    return timeB - timeA;
  });
});
// === 异步组件 ===
const ItemActionsMenu = defineAsyncComponent(() => import('./ItemActionsMenu.vue')); // 推荐将菜单抽离

// === API & 数据获取 ===
const fetchHistories = () => {
  Request.get("/chat/sessions").then(res => {
    chatHistory.value = res.data || [];
  });
  MindMapApi.getList().then(res => {
    mindMapHistory.value = res.data || [];
  });
};
const fetchUserSettings = () => {
  Request.get('/auth/theme').then(res => themeStore.setTheme(res.data?.theme));
};

// === 事件处理 ===
const toggleSidebar = () => {
  isSidebarCollapsed.value = !isSidebarCollapsed.value;
};
const onRailUpdate = (val) => {
  isSidebarCollapsed.value = val;
};
const navigateTo = (path) => {
  router.push(path);
};
const handleThemeToggle = () => {
  themeStore.toggleTheme();
  Request.put("/auth/settings", {theme: themeStore.theme});
};

const handleNewItemClick = () => {
  if (activeTab.value === 'kb') {
    kbStore.openUploadDialog();
    // 阻止导航
    event.preventDefault();
  }
};
// 合并后的“新建”按钮处理逻辑
const handleNewItem = () => {
  if (activeTab.value === 'kb') {
    kbStore.openUploadDialog();
  } else if (activeTab.value === 'chat') {
    router.push('/chat');
  } else if (activeTab.value === 'mindmap') {
    router.push('/mindmap');
  }
};
// === CRUD 逻辑 (对话框驱动) ===
const startEditing = (item, type) => {
  renameDialog.item = item;
  renameDialog.type = type;
  renameDialog.title = item.title;
  renameDialog.visible = true;
};
const executeRename = () => {
  const {item, type, title} = renameDialog;
  if (!item || !title.trim() || title.trim() === item.title) {
    renameDialog.visible = false;
    return;
  }
  const promise = type === 'chat'
      ? Request.put(`/chat/sessions/${item.id}`, {Title: title})
      : MindMapApi.update(item.id, {title});

  promise.then(() => {
    snackbar.success("重命名成功！");
    item.title = title;
    renameDialog.visible = false;
  });
};

const confirmDeleteItem = (item, type) => {
  deleteDialog.item = item;
  deleteDialog.type = type;
  deleteDialog.visible = true;
};
const executeDelete = () => {
  const {item, type} = deleteDialog;
  const promise = type === 'chat' ? Request.delete(`/chat/sessions/${item.id}`) : MindMapApi.delete(item.id);
  promise.then(() => {
    snackbar.success("删除成功");
    fetchHistories();
    if (route.params.id == item.id) {
      router.replace(type === 'chat' ? '/chat' : '/mindmap');
    }
    deleteDialog.visible = false;
  });
};

const quitLogin = () => {
  // 可以在这里加一个确认对话框
  Request.post('/logout');
  router.push('/login');
  setToken(null);
};

// === Watchers & 生命周期 ===
watch(() => route.path, (newPath) => {
  if (newPath.startsWith('/chat')) activeTab.value = 'chat';
  else if (newPath.startsWith('/mindmap')) activeTab.value = 'mindmap';
  else if (newPath.startsWith('/kb')) activeTab.value = 'kb';
}, {immediate: true});

onMounted(() => {
  fetchHistories();
  fetchUserSettings();
  window.addEventListener('new-session-created', fetchHistories);
});
onUnmounted(() => {
  window.removeEventListener('new-session-created', fetchHistories);
});
</script>

<style scoped>
.main-sidebar {
  border-right: 1px solid rgba(0, 0, 0, 0.12);
}
.sidebar-top {
  -webkit-app-region: drag;
}
.logo-text {
  font-weight: 500;
  font-size: 1.1rem;
  white-space: nowrap;
}
.new-item-menu-btn {
  justify-content: start;
  text-transform: none; /* 让按钮文字不是大写 */
  font-weight: 500;
}
.history-header {
  font-size: 0.8rem;
  font-weight: 500;
  color: rgba(var(--v-theme-on-surface), 0.6);
  padding-left: 16px;
  padding-top: 16px;
  letter-spacing: 0.5px;
}
.history-item .v-list-item-title {
  font-size: 0.9rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.history-item:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.04);
}
.history-item.v-list-item--active {
  background-color: rgba(var(--v-theme-primary), 0.1);
  color: rgb(var(--v-theme-primary));
}
.main-content {
  height: 100vh;
  overflow-y: hidden; /* 让子路由自己处理滚动 */
  background-color: rgb(var(--v-theme-background));
}
.user-profile {
  cursor: pointer;
}
</style>