<template>
  <div v-if="visible" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>ComfyUI 服务器配置</h2>
        <button class="close-btn" @click="closeModal">×</button>
      </div>

      <div class="modal-body">
        <p style="margin-bottom: 20px; color: #666; font-size: 14px;">
          配置原始ComfyUI服务器地址（如: https://dzqgp58z0s-8188.cnb.run）
        </p>
        <div class="config-section">
          <label for="comfyui-url">ComfyUI服务器地址:</label>
          <input
            id="comfyui-url"
            v-model="localConfig.COMFYUI_SERVER_URL"
            type="url"
            placeholder="https://dzqgp58z0s-8188.cnb.run"
            class="config-input"
          >
          <small class="help-text">原始ComfyUI服务器的完整URL地址</small>
        </div>

        <div class="config-section">
          <label>
            <input
              type="checkbox"
              v-model="localConfig.USE_PROXY"
              style="margin-right: 8px;"
            >
            使用代理服务器（推荐）
          </label>
          <small class="help-text">启用代理服务器可以避免CORS跨域问题，提高连接稳定性</small>
        </div>

        <div class="config-section">
          <label for="client-id">客户端ID:</label>
          <input
            id="client-id"
            v-model="localConfig.CLIENT_ID"
            type="text"
            placeholder="abc1373d4ad648a3a81d0587fbe5534b"
            class="config-input"
          >
          <small class="help-text">用于标识客户端的唯一ID</small>
        </div>

        <div class="config-section">
          <label for="timeout">请求超时 (秒):</label>
          <input
            id="timeout"
            v-model.number="timeoutSeconds"
            type="number"
            min="30"
            max="600"
            class="config-input"
          >
          <small class="help-text">API请求的超时时间，建议300秒</small>
        </div>

        <div class="config-section">
          <h3>连接测试</h3>
          <button @click="testConnection" :disabled="testing" class="test-btn">
            <span v-if="testing" class="loading-spinner"></span>
            {{ testing ? '测试中...' : '测试连接' }}
          </button>

          <div v-if="testResult" class="test-result" :class="{ 'success': testResult.success, 'error': !testResult.success }">
            <div class="result-icon">{{ testResult.success ? '✅' : '❌' }}</div>
            <div class="result-text">
              {{ testResult.success ? '连接成功！' : `连接失败: ${testResult.error}` }}
            </div>
          </div>
        </div>

        <div class="config-section">
          <h3>预设配置</h3>
          <div class="preset-buttons">
            <button @click="loadPreset('default')" class="preset-btn">默认配置</button>
            <button @click="loadPreset('local')" class="preset-btn">本地开发</button>
            <button @click="loadPreset('current')" class="preset-btn">当前地址</button>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button @click="resetConfig" class="btn btn-secondary">重置默认</button>
        <button @click="saveConfig" class="btn btn-primary" :disabled="!isValidConfig">保存配置</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { getCurrentConfig, updateComfyUIConfig, resetToDefaultConfig } from '../services/comfyui.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'saved'])

const localConfig = ref({
  COMFYUI_SERVER_URL: '',
  USE_PROXY: true,
  PROXY_SERVER_URL: 'http://localhost:3008/api',
  CLIENT_ID: '',
  TIMEOUT: 300000
})

const timeoutSeconds = computed({
  get: () => Math.floor(localConfig.value.TIMEOUT / 1000),
  set: (value) => {
    localConfig.value.TIMEOUT = value * 1000
  }
})

const testing = ref(false)
const testResult = ref(null)

// 验证配置是否有效
const isValidConfig = computed(() => {
  return localConfig.value.COMFYUI_SERVER_URL &&
         localConfig.value.COMFYUI_SERVER_URL.startsWith('http') &&
         localConfig.value.CLIENT_ID &&
         localConfig.value.TIMEOUT > 0
})

// 监听visible变化，加载当前配置
watch(() => props.visible, (newVisible) => {
  if (newVisible) {
    loadCurrentConfig()
    testResult.value = null
  }
})

// 加载当前配置
const loadCurrentConfig = () => {
  const currentConfig = getCurrentConfig()
  localConfig.value = { ...currentConfig }
}

// 测试连接
const testConnection = async () => {
  if (!isValidConfig.value) {
    testResult.value = { success: false, error: '请填写有效的配置信息' }
    return
  }

  testing.value = true
  testResult.value = null

  try {
    // 根据配置选择使用代理还是直连
    const testUrl = localConfig.value.USE_PROXY
      ? `${localConfig.value.PROXY_SERVER_URL}/system_stats`
      : `${localConfig.value.COMFYUI_SERVER_URL}/system_stats`

    console.log('测试连接:', testUrl, '使用代理:', localConfig.value.USE_PROXY)

    const response = await fetch(testUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(10000) // 10秒超时
    })

    if (response.ok) {
      const stats = await response.json()
      testResult.value = {
        success: true,
        data: stats
      }
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  } catch (error) {
    testResult.value = {
      success: false,
      error: error.message || '连接失败'
    }
  } finally {
    testing.value = false
  }
}

// 加载预设配置
const loadPreset = (preset) => {
  switch (preset) {
    case 'default':
      localConfig.value = {
        COMFYUI_SERVER_URL: 'https://dzqgp58z0s-8188.cnb.run',
        USE_PROXY: true,
        PROXY_SERVER_URL: 'http://localhost:3008/api',
        CLIENT_ID: 'abc1373d4ad648a3a81d0587fbe5534b',
        TIMEOUT: 300000
      }
      break
    case 'local':
      localConfig.value = {
        COMFYUI_SERVER_URL: 'http://localhost:8188',
        USE_PROXY: false,
        PROXY_SERVER_URL: 'http://localhost:3008/api',
        CLIENT_ID: 'local_client_id',
        TIMEOUT: 300000
      }
      break
    case 'current':
      localConfig.value = {
        COMFYUI_SERVER_URL: 'https://dzqgp58z0s-8188.cnb.run',
        USE_PROXY: true,
        PROXY_SERVER_URL: 'http://localhost:3008/api',
        CLIENT_ID: 'abc1373d4ad648a3a81d0587fbe5534b',
        TIMEOUT: 300000
      }
      break
  }
  testResult.value = null
}

// 保存配置
const saveConfig = () => {
  if (!isValidConfig.value) return

  updateComfyUIConfig(localConfig.value)
  emit('saved', localConfig.value)
  closeModal()
}

// 重置配置
const resetConfig = () => {
  const defaultConfig = resetToDefaultConfig()
  localConfig.value = { ...defaultConfig }
  testResult.value = null
}

// 关闭模态框
const closeModal = () => {
  emit('close')
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #eee;
}

.modal-header h2 {
  margin: 0;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #999;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  color: #333;
}

.modal-body {
  padding: 24px;
}

.config-section {
  margin-bottom: 24px;
}

.config-section label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.config-input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e1e5e9;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s;
}

.config-input:focus {
  outline: none;
  border-color: #667eea;
}

.help-text {
  display: block;
  margin-top: 4px;
  color: #666;
  font-size: 12px;
}

.test-btn {
  padding: 10px 20px;
  background: #007bff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.test-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.loading-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid #ffffff40;
  border-top: 2px solid white;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.test-result {
  margin-top: 12px;
  padding: 12px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.test-result.success {
  background: #d4edda;
  border: 1px solid #c3e6cb;
  color: #155724;
}

.test-result.error {
  background: #f8d7da;
  border: 1px solid #f5c6cb;
  color: #721c24;
}

.preset-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.preset-btn {
  padding: 8px 16px;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
}

.preset-btn:hover {
  background: #e9ecef;
}

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
}

.btn-primary {
  background: #667eea;
  color: white;
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-secondary {
  background: #6c757d;
  color: white;
}
</style>
