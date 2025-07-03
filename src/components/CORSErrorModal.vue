<template>
  <div v-if="visible" class="cors-error-modal">
    <div class="modal-overlay" @click="$emit('close')"></div>
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">
          <span class="error-icon">⚠️</span>
          {{ errorInfo.message }}
        </h2>
        <button @click="$emit('close')" class="close-btn">×</button>
      </div>

      <div class="modal-body">
        <div class="error-details">
          <p class="details-text">{{ errorInfo.details }}</p>
        </div>

        <div class="solutions-section">
          <h3 class="solutions-title">💡 解决方案：</h3>
          <ul class="solutions-list">
            <li v-for="(solution, index) in errorInfo.solutions" :key="index" class="solution-item">
              {{ solution }}
            </li>
          </ul>
        </div>

        <div v-if="errorInfo.type === 'cors'" class="cors-guide">
          <h3 class="guide-title">🔧 ComfyUI CORS 配置指南：</h3>
          <div class="guide-content">
            <p class="guide-text">在ComfyUI服务器上添加以下配置：</p>
            <div class="code-block">
              <pre><code># 在ComfyUI启动参数中添加：
--cors-allow-origins=https://fooldychi.github.io
--cors-allow-methods=GET,POST,PUT,DELETE,OPTIONS
--cors-allow-headers=Content-Type,Authorization</code></pre>
            </div>
            <p class="guide-note">
              <strong>注意：</strong> 具体配置方法可能因ComfyUI版本而异，请查阅相关文档。
            </p>
          </div>
        </div>

        <div class="alternative-section">
          <h3 class="alternative-title">🚀 替代方案：</h3>
          <div class="alternative-options">
            <div class="option-card">
              <h4>方案1：本地代理服务器</h4>
              <p>运行项目中的 proxy-server.js，然后在配置中选择"使用代理服务器"</p>
            </div>
            <div class="option-card">
              <h4>方案2：部署后端API</h4>
              <p>部署一个支持CORS的后端服务，作为ComfyUI的代理</p>
            </div>
            <div class="option-card">
              <h4>方案3：本地运行</h4>
              <p>在本地环境运行此应用，避免跨域问题</p>
            </div>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <van-button @click="openSolutions" type="primary" size="normal" round>
          选择解决方案
        </van-button>
        <van-button @click="openGuide" type="default" size="normal" round>
          详细教程
        </van-button>
        <van-button @click="$emit('close')" type="default" size="normal" round>
          关闭
        </van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { defineProps, defineEmits } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  errorInfo: {
    type: Object,
    default: () => ({
      type: 'unknown',
      message: '未知错误',
      details: '',
      solutions: []
    })
  }
})

const emit = defineEmits(['close', 'open-config'])

const openConfig = () => {
  emit('open-config')
  emit('close')
}

const openSolutions = () => {
  router.push('/solutions')
  emit('close')
}

const openGuide = () => {
  router.push('/cors-guide')
  emit('close')
}
</script>

<style scoped>
.cors-error-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
}

.modal-content {
  position: relative;
  background: var(--bg-card);
  border-radius: 16px;
  max-width: 600px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--border-color);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
  color: var(--text-color);
  font-size: 1.25rem;
  font-weight: 600;
}

.error-icon {
  font-size: 1.5rem;
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-light);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: var(--transition);
}

.close-btn:hover {
  background: var(--bg-hover);
  color: var(--text-color);
}

.modal-body {
  padding: 20px;
}

.error-details {
  margin-bottom: 24px;
}

.details-text {
  color: var(--text-light);
  line-height: 1.6;
  margin: 0;
}

.solutions-section,
.cors-guide,
.alternative-section {
  margin-bottom: 24px;
}

.solutions-title,
.guide-title,
.alternative-title {
  color: var(--text-color);
  font-size: 1.1rem;
  font-weight: 600;
  margin: 0 0 12px 0;
}

.solutions-list {
  margin: 0;
  padding-left: 20px;
}

.solution-item {
  color: var(--text-light);
  line-height: 1.6;
  margin-bottom: 8px;
}

.guide-content {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--border-color);
}

.guide-text {
  color: var(--text-light);
  margin: 0 0 12px 0;
}

.code-block {
  background: var(--bg-primary);
  border-radius: 6px;
  padding: 12px;
  margin: 12px 0;
  border: 1px solid var(--border-color);
}

.code-block pre {
  margin: 0;
  color: var(--text-color);
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  line-height: 1.4;
  white-space: pre-wrap;
}

.guide-note {
  color: var(--warning-color);
  font-size: 0.9rem;
  margin: 12px 0 0 0;
}

.alternative-options {
  display: grid;
  gap: 12px;
}

.option-card {
  background: var(--bg-secondary);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--border-color);
}

.option-card h4 {
  color: var(--text-color);
  margin: 0 0 8px 0;
  font-size: 1rem;
  font-weight: 600;
}

.option-card p {
  color: var(--text-light);
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
}

.modal-footer {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding: 20px;
  border-top: 1px solid var(--border-color);
}

@media (max-width: 768px) {
  .modal-content {
    margin: 10px;
    max-height: 90vh;
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding: 16px;
  }

  .modal-footer {
    flex-direction: column;
  }
}
</style>
