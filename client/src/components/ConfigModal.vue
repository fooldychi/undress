<template>
  <div v-if="visible" class="modal-overlay" @click="closeModal">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>ComfyUI 服务器配置</h2>
        <button class="close-btn" @click="closeModal">×</button>
      </div>

      <div class="modal-body">
        <p style="margin-bottom: 20px; color: var(--text-light); font-size: 14px;">
          配置原始ComfyUI服务器地址（如: https://hwf0p724ub-8188.cnb.run）
        </p>
        <div class="config-section">
          <label for="comfyui-url">ComfyUI服务器地址:</label>
          <input
            id="comfyui-url"
            v-model="localConfig.COMFYUI_SERVER_URL"
            type="url"
            placeholder="https://hwf0p724ub-8188.cnb.run"
            class="config-input"
          >
          <small class="help-text">原始ComfyUI服务器的完整URL地址</small>
        </div>

        <!-- CORS已在服务端配置，使用直连模式 -->

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

        <!-- 连接测试功能已删除 -->

        <!-- 预设配置已删除 -->
      </div>

      <div class="modal-footer">
        <van-button
          @click="resetConfig"
          type="default"
          size="normal"
          round
        >
          重置默认
        </van-button>
        <van-button
          @click="saveConfig"
          :disabled="!isValidConfig"
          type="primary"
          size="normal"
          round
        >
          保存配置
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { getCurrentConfig, updateComfyUIConfig, resetToDefaultConfig } from '../services/comfyui.js'
import configService from '../services/configService.js'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'saved'])

const localConfig = ref({
  COMFYUI_SERVER_URL: '',
  CLIENT_ID: '',
  TIMEOUT: 300000
})

const timeoutSeconds = computed({
  get: () => Math.floor(localConfig.value.TIMEOUT / 1000),
  set: (value) => {
    localConfig.value.TIMEOUT = value * 1000
  }
})

// 测试相关变量已删除

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
  }
})

// 加载当前配置
const loadCurrentConfig = async () => {
  try {
    // 首先尝试从服务端获取最新配置
    const serverConfig = await configService.getConfig()

    // 提取ComfyUI相关配置
    const comfyuiServerConfig = {
      COMFYUI_SERVER_URL: serverConfig['comfyui.server_url'] || '',
      CLIENT_ID: serverConfig['comfyui.client_id'] || '',
      TIMEOUT: serverConfig['comfyui.timeout'] || 300000
    }

    // 获取本地配置
    const currentConfig = getCurrentConfig()

    // 合并服务端配置和本地配置，优先使用服务端配置
    localConfig.value = {
      ...currentConfig,
      ...Object.fromEntries(
        Object.entries(comfyuiServerConfig).filter(([key, value]) => value != null && value !== '')
      )
    }

    console.log('📋 配置加载完成:', localConfig.value)
  } catch (error) {
    console.warn('⚠️ 从服务端加载配置失败，使用本地配置:', error)
    // 回退到本地配置
    const currentConfig = getCurrentConfig()
    localConfig.value = { ...currentConfig }
  }
}

// 测试连接功能已删除

// 预设配置功能已删除

// 保存配置
const saveConfig = async () => {
  if (!isValidConfig.value) return

  try {
    console.log('💾 保存配置中...')
    const result = await updateComfyUIConfig(localConfig.value)

    // 显示保存结果
    if (result.proxyUpdate.success) {
      console.log('✅ 配置保存成功，代理服务器已同步更新')
    } else {
      console.warn('⚠️ 配置已保存，但代理服务器更新失败:', result.proxyUpdate.message)
      // 可以选择显示警告，但不阻止保存
      if (localConfig.value.USE_PROXY) {
        alert(`配置已保存，但代理服务器更新失败: ${result.proxyUpdate.message}\n\n请确保代理服务器正在运行，或考虑重启代理服务器。`)
      }
    }

    emit('saved', result.config)
    closeModal()
  } catch (error) {
    console.error('保存配置失败:', error)
    alert('保存配置失败: ' + error.message)
  }
}

// 重置配置
const resetConfig = () => {
  const defaultConfig = resetToDefaultConfig()
  localConfig.value = { ...defaultConfig }
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
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5);
  color: var(--text-color);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
  color: var(--text-color);
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-light);
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: all 0.2s;
}

.close-btn:hover {
  background-color: rgba(255, 255, 255, 0.1);
  color: var(--text-color);
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
  color: var(--text-color);
}

.config-input {
  width: 100%;
  padding: 12px;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 14px;
  background: var(--bg-dark-light);
  color: var(--text-color);
  transition: border-color 0.3s;
}

.config-input:focus {
  outline: none;
  border-color: var(--primary-color);
}

.config-input::placeholder {
  color: var(--text-muted);
}

.help-text {
  display: block;
  margin-top: 4px;
  color: var(--text-light);
  font-size: 12px;
}

/* 测试相关样式已删除 */

/* 预设配置样式已删除 */

.modal-footer {
  padding: 20px 24px;
  border-top: 1px solid #eee;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 按钮样式已移至AppButton组件 */
</style>
