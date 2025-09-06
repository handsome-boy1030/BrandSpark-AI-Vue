<template>
  <v-container fluid class="login-container fill-height">

    <v-row justify="center" align="center" class="fill-height">
      <v-col cols="12" sm="8" md="5" lg="4" xl="3">
        <v-card
            class="login-card elevation-12"
            rounded="xl"
        >
          <!-- 加载遮罩 -->
          <v-overlay
              v-model="loginSuccess"
              contained
              persistent
              class="d-flex flex-column align-center justify-center"
          >
            <v-progress-circular
                indeterminate
                size="64"
                color="primary"
                class="mb-4"
            />
            <v-chip color="success" variant="elevated" class="text-h6">
              <v-icon start>mdi-check-circle</v-icon>
              登录成功，正在跳转...
            </v-chip>
          </v-overlay>

          <v-card-text class="pa-8">
            <!-- 登录头部 -->
            <div class="text-center mb-8">
              <v-img
                  src="/logo.png"
                  alt="Site Logo"
                  width="300"
                  height="200"
                  class="mb-4 mx-auto"
                  contain
              />
              <h1 class="text-h4 font-weight-bold text-primary mb-2">欢迎回来</h1>
            </div>

            <!-- 登录表单 -->
            <v-form ref="loginForm" v-model="formValid" @submit.prevent="handleLogin">
              <v-text-field
                  v-model="form.username"
                  label="用户名"
                  variant="outlined"
                  prepend-inner-icon="mdi-account"
                  :rules="usernameRules"
                  required
                  class="mb-4"
                  color="primary"
              />

              <v-text-field
                  v-model="form.password"
                  label="密码"
                  variant="outlined"
                  prepend-inner-icon="mdi-lock"
                  :append-inner-icon="showPassword ? 'mdi-eye' : 'mdi-eye-off'"
                  :type="showPassword ? 'text' : 'password'"
                  :rules="passwordRules"
                  required
                  class="mb-4"
                  color="primary"
                  @click:append-inner="showPassword = !showPassword"
                  @keydown.enter="handleLogin"
              />

              <!-- 记住我 -->
              <v-checkbox
                  v-model="form.remember"
                  label="记住我"
                  color="primary"
                  hide-details
                  class="mb-6"
              />

              <!-- 登录按钮 -->
              <v-btn
                  :loading="isLogin"
                  :disabled="!formValid"
                  type="submit"
                  color="primary"
                  size="large"
                  variant="elevated"
                  block
                  rounded="lg"
                  class="mb-4 text-h6"
              >
                <template v-slot:prepend>
                  <v-icon>mdi-login</v-icon>
                </template>
                {{ isLogin ? '登录中...' : '登录' }}
              </v-btn>

              <!-- 其他操作 -->
              <div class="d-flex justify-space-between">
                <v-btn
                    variant="text"
                    color="primary"
                    size="small"
                >
                  忘记密码？
                </v-btn>
                <v-btn
                    variant="text"
                    color="primary"
                    size="small"
                    @click="goRegister"
                >
                  注册账号
                </v-btn>
              </div>
            </v-form>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>

    <!-- 背景装饰 -->
    <div class="background-decoration">
      <div class="decoration-circle circle-1"></div>
      <div class="decoration-circle circle-2"></div>
      <div class="decoration-circle circle-3"></div>
    </div>
  </v-container>
</template>

<script setup>
import { reactive, ref } from 'vue';
import Request from '../utils/Request.js';
import CryptoJS from 'crypto-js';
import Cookies from 'js-cookie';
import { set } from '../utils/Storage.js';
import { useRouter } from 'vue-router';
import { snackbar } from '@/utils/Snackbar.js';

const router = useRouter();
const loginForm = ref(null);
const formValid = ref(false);
const showPassword = ref(false);

const form = reactive({
  username: '',
  password: '',
  remember: false
});

const isLogin = ref(false);
const loginSuccess = ref(false);

// 表单验证规则
const usernameRules = [
  v => !!v || '用户名不能为空',
  v => (v && v.length >= 2) || '用户名至少需要2个字符'
];

const passwordRules = [
  v => !!v || '密码不能为空',
  v => (v && v.length >= 6) || '密码至少需要6个字符'
];

async function handleLogin() {
  if (!formValid.value) {
    snackbar.warning('请正确填写所有必填项');
    return;
  }

  isLogin.value = true;
  const password = form.password;
  const remember = form.remember;
  delete form.remember;

  try {
    // form.password = CryptoJS.MD5(password).toString();
    const data = await Request.postWithoutToken('/login', form);

    if (data.token) {
      snackbar.success('登录成功！');

      if (remember) {
        Cookies.set('Admin-Token', data.token, { expires: 7 });
      } else {
        Cookies.set('Admin-Token', data.token);
      }

      loginSuccess.value = true;

      const userInfo = await Request.get('/getInfo');
      set('userId', userInfo.data.userId);

      // 延迟跳转，让用户看到成功提示
      setTimeout(() => {
        router.push('/chat');
      }, 1500);
    } else {
      snackbar.error(data.message || '登录失败，请检查用户名和密码');
    }
  } catch (error) {
    console.error('登录失败:', error);
    snackbar.error('登录失败，请检查网络连接');
  } finally {
    isLogin.value = false;
    form.password = password;
    form.remember = remember;
  }
}

//跳转注册页面
function goRegister(){
  router.push("/register");
}
</script>

<style scoped>
.login-container {
  background: linear-gradient(135deg, #667eea 0%, #69e1e8 100%);
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

.login-card {
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95) !important;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
}

.background-decoration {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 0;
}

.decoration-circle {
  position: absolute;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
  backdrop-filter: blur(10px);
}

.circle-1 {
  width: 200px;
  height: 200px;
  top: 10%;
  right: 10%;
  animation: float 6s ease-in-out infinite;
}

.circle-2 {
  width: 150px;
  height: 150px;
  bottom: 20%;
  left: 15%;
  animation: float 8s ease-in-out infinite reverse;
}

.circle-3 {
  width: 100px;
  height: 100px;
  top: 60%;
  right: 20%;
  animation: float 10s ease-in-out infinite;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(10deg);
  }
}

/* 响应式设计 */
@media (max-width: 600px) {
  .login-card {
    margin: 16px;
  }

  .decoration-circle {
    display: none;
  }
}

/* 深色主题适配 */
.v-theme--dark .login-card {
  background: rgba(33, 33, 33, 0.95) !important;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
</style>