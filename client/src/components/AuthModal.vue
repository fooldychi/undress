<template>
  <van-popup
    v-model:show="visible"
    position="center"
    :style="{ width: '90%', maxWidth: '400px', borderRadius: '16px' }"
    :close-on-click-overlay="false"
  >
    <div class="auth-modal">
      <!-- 头部 -->
      <div class="auth-header">
        <h2 class="auth-title">{{ isLogin ? '登录' : '注册' }}</h2>
        <van-icon
          name="cross"
          size="20"
          class="close-btn"
          @click="closeModal"
        />
      </div>

      <!-- 表单 -->
      <div class="auth-form">
        <form @submit.prevent="handleSubmit">
          <!-- 用户名输入 -->
          <BaseInput
            v-model="formData.username"
            label="用户名"
            placeholder="请输入用户名"
            left-icon="user-o"
            :rules="usernameRules"
            clearable
          />

          <!-- 密码输入 -->
          <BaseInput
            v-model="formData.password"
            type="password"
            label="密码"
            placeholder="请输入密码"
            left-icon="lock"
            :rules="passwordRules"
            clearable
          />

          <!-- 确认密码输入（仅注册时显示） -->
          <BaseInput
            v-if="!isLogin"
            v-model="formData.confirmPassword"
            type="password"
            label="确认密码"
            placeholder="请再次输入密码"
            left-icon="lock"
            :rules="confirmPasswordRules"
            clearable
          />

          <!-- 提交按钮 -->
          <div class="auth-actions">
            <van-button
              type="primary"
              native-type="submit"
              block
              round
              :loading="loading"
              :disabled="loading"
              class="auth-submit-btn"
            >
              {{ loading ? (isLogin ? '登录中...' : '注册中...') : (isLogin ? '登录' : '注册') }}
            </van-button>
          </div>
        </form>

        <!-- 切换登录/注册 -->
        <div class="auth-switch">
          <span class="switch-text">
            {{ isLogin ? '还没有账号？' : '已有账号？' }}
          </span>
          <van-button
            type="primary"
            plain
            size="small"
            @click="toggleMode"
          >
            {{ isLogin ? '立即注册' : '立即登录' }}
          </van-button>
        </div>
      </div>
    </div>
  </van-popup>
</template>

<script>
import { ref, reactive, computed, watch } from 'vue'
import { Toast } from 'vant'
import { authApi } from '../services/api.js'
import BaseInput from './BaseInput.vue'

export default {
  name: 'AuthModal',
  components: {
    BaseInput
  },
  props: {
    show: {
      type: Boolean,
      default: false
    },
    defaultMode: {
      type: String,
      default: 'login', // 'login' 或 'register'
      validator: (value) => ['login', 'register'].includes(value)
    }
  },
  emits: ['update:show', 'success'],
  setup(props, { emit }) {
    const visible = computed({
      get: () => props.show,
      set: (value) => emit('update:show', value)
    })

    const isLogin = ref(props.defaultMode === 'login')
    const loading = ref(false)

    // 表单数据
    const formData = reactive({
      username: '',
      password: '',
      confirmPassword: ''
    })

    // 表单验证规则
    const usernameRules = [
      { required: true, message: '请输入用户名' },
      { pattern: /^[a-zA-Z0-9]{3,30}$/, message: '用户名只能包含字母和数字，长度3-30位' }
    ]

    const passwordRules = [
      { required: true, message: '请输入密码' },
      { min: 6, message: '密码至少6位' }
    ]

    const confirmPasswordRules = computed(() => [
      { required: true, message: '请确认密码' },
      {
        validator: (value) => value === formData.password,
        message: '两次输入的密码不一致'
      }
    ])

    // 重置表单
    const resetForm = () => {
      formData.username = ''
      formData.password = ''
      formData.confirmPassword = ''
    }

    // 切换登录/注册模式
    const toggleMode = () => {
      isLogin.value = !isLogin.value
      resetForm()
    }

    // 关闭弹窗
    const closeModal = () => {
      visible.value = false
      resetForm()
    }

    // 处理表单提交
    const handleSubmit = async () => {
      if (loading.value) return

      // 验证表单
      if (!formData.username.trim()) {
        Toast.fail('请输入用户名')
        return
      }

      if (!formData.password.trim()) {
        Toast.fail('请输入密码')
        return
      }

      if (!isLogin.value && formData.password !== formData.confirmPassword) {
        Toast.fail('两次输入的密码不一致')
        return
      }

      loading.value = true

      try {
        let response
        if (isLogin.value) {
          // 登录
          response = await authApi.login(formData.username, formData.password)
        } else {
          // 注册
          response = await authApi.register(formData.username, formData.password)
        }

        if (response.success) {
          console.log('认证成功，响应数据:', response)
          Toast.success(response.message || (isLogin.value ? '登录成功' : '注册成功'))

          const successData = {
            type: isLogin.value ? 'login' : 'register',
            user: response.data.user
          }
          console.log('触发success事件，数据:', successData)

          emit('success', successData)
          closeModal()
        } else {
          console.log('认证失败，响应数据:', response)
          Toast.fail(response.message || (isLogin.value ? '登录失败' : '注册失败'))
        }
      } catch (error) {
        console.error('认证失败:', error)
        Toast.fail(error.message || (isLogin.value ? '登录失败' : '注册失败'))
      } finally {
        loading.value = false
      }
    }

    // 监听弹窗显示状态，重置表单
    watch(visible, (newValue) => {
      if (newValue) {
        isLogin.value = props.defaultMode === 'login'
        resetForm()
      }
    })

    return {
      visible,
      isLogin,
      loading,
      formData,
      usernameRules,
      passwordRules,
      confirmPasswordRules,
      toggleMode,
      closeModal,
      handleSubmit
    }
  }
}
</script>

<style scoped>
.auth-modal {
  padding: 24px;
  background: white;
  border-radius: 16px;
}

.auth-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.auth-title {
  font-size: 20px;
  font-weight: 600;
  color: #323233;
  margin: 0;
}

.close-btn {
  color: #969799;
  cursor: pointer;
  transition: color 0.3s;
}

.close-btn:hover {
  color: #323233;
}

.auth-form {
  width: 100%;
}

.auth-actions {
  margin: 24px 0 16px 0;
}

.auth-submit-btn {
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  background: linear-gradient(135deg, #1989fa, #1976d2);
  border: none;
  box-shadow: 0 4px 12px rgba(25, 137, 250, 0.3);
  transition: all 0.3s ease;
}

.auth-submit-btn:hover {
  background: linear-gradient(135deg, #1976d2, #1565c0);
  box-shadow: 0 6px 16px rgba(25, 137, 250, 0.4);
  transform: translateY(-1px);
}

.auth-submit-btn:active {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(25, 137, 250, 0.3);
}

.auth-switch {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid #ebedf0;
}

.switch-text {
  font-size: 14px;
  color: #969799;
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .auth-modal {
    background: #1e1e1e;
  }

  .auth-title {
    color: #ffffff;
  }

  .close-btn {
    color: #969799;
  }

  .close-btn:hover {
    color: #ffffff;
  }

  .auth-switch {
    border-top-color: #2c2c2e;
  }

  .switch-text {
    color: #8e8e93;
  }
}
</style>
