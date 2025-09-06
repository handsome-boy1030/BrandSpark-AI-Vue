import {createRouter, createWebHistory} from 'vue-router';
import {getToken} from "@/utils/Storage.js";
import {isTokenExpired} from "@/utils/TokenUtils.js";


// 定义路由规则数组
const routes = [
    {
        path: '/login',
        name: 'Login',
        component: () => import("./views/Login.vue")
    },{
        path: '/register',
        name: 'Register',
        component: () => import("./views/Register.vue")
    },
    {
        path: '/',
        component: () => import('@/components/layout/Layout.vue'),
        redirect: '/chat',
        children: [
            {
                path: 'chat/:id?',
                name: 'chat',
                component: () => import('@/views/chat/ChatPage.vue'),
            },{
                path: 'mindmap/:id?',
                name: 'mindmap',
                component: () => import('@/views/mindmap/MindMapEditor.vue'),
            }
        ]
    },
    {
        path: '/kb',
        component: () => import('@/views/kb/KnowledgeBasePage.vue'), // 新的布局容器
        redirect: '/kb/list', // 默认重定向到列表页
        children: [
            {
                path: 'list', // 对应 /kb/list
                name: 'kb-list',
                component: () => import('@/views/kb/ArticleListPage.vue') // 原来的列表页逻辑
            },
            {
                path: 'article/:id', // 对应 /kb/article/:id
                name: 'kb-article-detail',
                component: () => import('@/views/kb/ArticleDetailPage.vue') // 详情页
            }
        ]
    }
];

// 创建路由实例
const router = createRouter({
    history: createWebHistory(), // 使用 HTML5 History 模式
    routes
});
//路由守卫
router.beforeEach((to, from, next) => {
    const token = getToken();
    const tokenExpired = token && isTokenExpired(token);
    // 需要认证的白名单（不需要token的路径）
    const whiteList = ['/login'];
    if (token && !tokenExpired) {
        // 已登录状态访问登录页时跳转到首页
        if (to.path === '/login') {
            next('/chat');
        } else {
            next();
        }
    } else {
        // 未登录状态访问非白名单页面时跳转登录页
        if (!whiteList.includes(to.path)) {
            next('/login');
        } else {
            next();
        }
    }
});
// 导出路由
export default router;