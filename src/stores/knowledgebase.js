import { defineStore } from 'pinia';
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { snackbar } from '@/utils/Snackbar.js'; //用于弹出提示信息的
import KbApi from '@/api/knowledgebase.js';

export const useKnowledgeBaseStore = defineStore('knowledgebase', () => {
    const router = useRouter();

    // --- State ---
    const articles = ref([]);
    const total = ref(0);
    const allTags = ref([]);
    const loading = ref({
        list: false,
        tags: false,
    });
    const uploadDialogVisible = ref(false);

    const queryParams = reactive({
        PageNumber: 1,
        PageSize: 10,
        SearchTerm: '',
        Tags: [],
    });

    // --- Getters ---
    const pageTitle = computed(() => {
        if (queryParams.Tags && queryParams.Tags.length > 0) return `标签: ${queryParams.Tags[0]}`;
        if (queryParams.SearchTerm) return `搜索: "${queryParams.SearchTerm}"`;
        return '所有文档';
    });

    // --- Actions ---
    const fetchArticles = async () => {
        loading.value.list = true;
        const params = { ...queryParams, Tags: queryParams.Tags.join(',') };
        try {
            const response = await KbApi.getArticles(params);
            articles.value = response.data.items;
            total.value = response.data.totalRecords;
        } catch (error) {
            snackbar.error('获取文章列表失败');
        } finally {
            loading.value.list = false;
        }
    };

    const fetchAllTags = async (forceRefresh = false) => {
        if (allTags.value.length > 0 && !forceRefresh) return;
        loading.value.tags = true;
        try {
            const response = await KbApi.getAllTags();
            allTags.value = response.data || [];
        } catch (error) {
            snackbar.error('获取标签列表失败');
        } finally {
            loading.value.tags = false;
        }
    };

    const updateFromRoute = (query) => {
        queryParams.SearchTerm = query.q || '';
        queryParams.Tags = query.tag ? [decodeURIComponent(query.tag)] : [];
        queryParams.PageNumber = 1; // Reset to first page on filter change
        fetchArticles();
    };

    const deleteArticle = async (articleId) => {
        try {
            await KbApi.deleteArticle(articleId);
            snackbar.success('删除成功');
            // 如果当前页只剩一条数据且不是第一页，删除后返回上一页
            if (articles.value.length === 1 && queryParams.PageNumber > 1) {
                queryParams.PageNumber--;
            }
            fetchArticles();
            // 删除可能导致某些标签不再存在，刷新标签列表
            fetchAllTags(true);
        } catch (error) {
            snackbar.error('删除失败');
        }
    };

    const handleUpload = async (formData) => {
        try {
            await KbApi.uploadArticle(formData);
            snackbar.success('上传成功，文件正在后台处理...');
            uploadDialogVisible.value = false;
            // 延迟刷新，等待后台处理完成
            setTimeout(() => {
                fetchArticles();
                fetchAllTags(true); // 新文件可能包含新标签
            }, 1500);
        } catch (error) {
            snackbar.error('上传失败');
        }
    };

    // Dialog controls
    const openUploadDialog = () => uploadDialogVisible.value = true;
    const closeUploadDialog = () => uploadDialogVisible.value = false;


    return {
        // State
        articles,
        total,
        allTags,
        loading,
        uploadDialogVisible,
        queryParams,
        // Getters
        pageTitle,
        // Actions
        fetchArticles,
        fetchAllTags,
        updateFromRoute,
        deleteArticle,
        handleUpload,
        openUploadDialog,
        closeUploadDialog,
    };
});