<template>
  <div class="api-test-page">
    <div class="container">
      <h1>ComfyUI API 两步流程测试</h1>

      <div class="test-section">
        <h2>测试流程</h2>
        <div class="flow-diagram">
          <div class="step" :class="{ active: currentStep >= 1, completed: currentStep > 1 }">
            <div class="step-number">1</div>
            <div class="step-content">
              <h3>上传图片</h3>
              <p>POST /api/upload/image</p>
            </div>
          </div>

          <div class="arrow">→</div>

          <div class="step" :class="{ active: currentStep >= 2, completed: currentStep > 2 }">
            <div class="step-number">2</div>
            <div class="step-content">
              <h3>提交工作流</h3>
              <p>POST /api/prompt</p>
            </div>
          </div>
        </div>
      </div>

      <div class="test-section">
        <h2>选择测试图片</h2>
        <input type="file" @change="handleFileSelect" accept="image/*" class="file-input">
        <div v-if="selectedImage" class="image-preview">
          <img :src="selectedImage" alt="测试图片" class="preview-img">
        </div>
      </div>

      <div class="test-section">
        <h2>API测试</h2>
        <button @click="testStep1" :disabled="!selectedImage || testing" class="test-btn step1-btn">
          {{ testing && currentStep === 1 ? '上传中...' : '测试第一步：上传图片' }}
        </button>

        <button @click="testStep2" :disabled="!step1Result || testing" class="test-btn step2-btn">
          {{ testing && currentStep === 2 ? '提交中...' : '测试第二步：提交工作流' }}
        </button>

        <button @click="testFullFlow" :disabled="!selectedImage || testing" class="test-btn full-btn">
          {{ testing ? '处理中...' : '测试完整流程' }}
        </button>
      </div>

      <div class="results-section">
        <div v-if="step1Result" class="result-box">
          <h3>第一步结果：</h3>
          <pre>{{ JSON.stringify(step1Result, null, 2) }}</pre>
        </div>

        <div v-if="step2Result" class="result-box">
          <h3>第二步结果：</h3>
          <pre>{{ JSON.stringify(step2Result, null, 2) }}</pre>
        </div>

        <div v-if="fullResult" class="result-box">
          <h3>完整流程结果：</h3>
          <pre>{{ JSON.stringify(fullResult, null, 2) }}</pre>
          <div v-if="fullResult.success && fullResult.resultImage" class="result-image">
            <h4>生成的图片：</h4>
            <img :src="fullResult.resultImage" alt="生成结果" class="result-img">
          </div>
        </div>
      </div>

      <div class="logs-section">
        <h2>实时日志</h2>
        <div class="log-container">
          <div v-for="(log, index) in logs" :key="index" class="log-entry">
            <span class="log-time">{{ log.time }}</span>
            <span class="log-message">{{ log.message }}</span>
          </div>
        </div>
        <button @click="clearLogs" class="clear-btn">清除日志</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { getCurrentConfig } from '../services/comfyui.js'
import undressWorkflow from '../workflows/undress.json'

const selectedImage = ref(null)
const testing = ref(false)
const currentStep = ref(0)
const step1Result = ref(null)
const step2Result = ref(null)
const fullResult = ref(null)
const logs = ref([])

// 添加日志
const addLog = (message) => {
  logs.value.push({
    time: new Date().toLocaleTimeString(),
    message
  })
}

// 文件选择
const handleFileSelect = (event) => {
  const file = event.target.files[0]
  if (file) {
    const reader = new FileReader()
    reader.onload = (e) => {
      selectedImage.value = e.target.result
      addLog(`选择了图片: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`)
    }
    reader.readAsDataURL(file)
  }
}

// 测试第一步：上传图片
const testStep1 = async () => {
  if (!selectedImage.value) return

  testing.value = true
  currentStep.value = 1
  step1Result.value = null

  try {
    const config = getCurrentConfig()
    addLog('🔄 开始第一步：上传图片')
    addLog(`📡 API地址: ${config.BASE_URL}/upload/image`)

    // 准备FormData
    const base64Data = selectedImage.value.split(',')[1]
    const mimeType = selectedImage.value.split(',')[0].split(':')[1].split(';')[0]
    const extension = mimeType.split('/')[1] || 'jpg'
    const filename = `test_${Date.now()}.${extension}`

    const byteCharacters = atob(base64Data)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    const blob = new Blob([byteArray], { type: mimeType })

    const formData = new FormData()
    formData.append('image', blob, filename)
    formData.append('type', 'input')
    formData.append('subfolder', '')

    addLog(`📤 上传文件: ${filename}`)

    const response = await fetch(`${config.BASE_URL}/upload/image`, {
      method: 'POST',
      body: formData
    })

    addLog(`📥 响应状态: ${response.status} ${response.statusText}`)

    if (response.ok) {
      const result = await response.json()
      step1Result.value = result
      addLog('✅ 第一步成功完成')
      currentStep.value = 2
    } else {
      const errorText = await response.text()
      throw new Error(`${response.status}: ${errorText}`)
    }

  } catch (error) {
    addLog(`❌ 第一步失败: ${error.message}`)
    step1Result.value = { error: error.message }
  } finally {
    testing.value = false
  }
}

// 测试第二步：提交工作流
const testStep2 = async () => {
  if (!step1Result.value || !step1Result.value.name) return

  testing.value = true
  currentStep.value = 2
  step2Result.value = null

  try {
    const config = getCurrentConfig()
    addLog('🔄 开始第二步：提交工作流')
    addLog(`📡 API地址: ${config.BASE_URL}/prompt`)

    // 创建工作流
    const workflow = JSON.parse(JSON.stringify(undressWorkflow))
    workflow['49'].inputs.image = step1Result.value.name

    const requestBody = {
      client_id: config.CLIENT_ID,
      prompt: workflow
    }

    addLog(`🔧 设置节点49图片: ${step1Result.value.name}`)

    const response = await fetch(`${config.BASE_URL}/prompt`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    })

    addLog(`📥 响应状态: ${response.status} ${response.statusText}`)

    if (response.ok) {
      const result = await response.json()
      step2Result.value = result
      addLog('✅ 第二步成功完成')
      addLog(`🆔 任务ID: ${result.prompt_id}`)
      currentStep.value = 3
    } else {
      const errorText = await response.text()
      throw new Error(`${response.status}: ${errorText}`)
    }

  } catch (error) {
    addLog(`❌ 第二步失败: ${error.message}`)
    step2Result.value = { error: error.message }
  } finally {
    testing.value = false
  }
}

// 测试完整流程
const testFullFlow = async () => {
  if (!selectedImage.value) return

  testing.value = true
  currentStep.value = 1
  fullResult.value = null

  try {
    addLog('🚀 开始完整流程测试')

    // 导入完整流程函数
    const { processUndressImage } = await import('../services/comfyui.js')
    const result = await processUndressImage(selectedImage.value)

    fullResult.value = result

    if (result.success) {
      addLog('🎉 完整流程测试成功')
    } else {
      addLog(`❌ 完整流程测试失败: ${result.error}`)
    }

  } catch (error) {
    addLog(`❌ 完整流程测试异常: ${error.message}`)
    fullResult.value = { success: false, error: error.message }
  } finally {
    testing.value = false
    currentStep.value = 0
  }
}

// 清除日志
const clearLogs = () => {
  logs.value = []
}
</script>

<style scoped>
.api-test-page {
  min-height: 100vh;
  padding: 20px;
  background: #f5f5f5;
}

.container {
  max-width: 1000px;
  margin: 0 auto;
}

.test-section {
  background: white;
  margin: 20px 0;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.flow-diagram {
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 20px 0;
}

.step {
  display: flex;
  align-items: center;
  padding: 15px;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: #f9f9f9;
  transition: all 0.3s;
}

.step.active {
  border-color: #007bff;
  background: #e3f2fd;
}

.step.completed {
  border-color: #28a745;
  background: #d4edda;
}

.step-number {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #ddd;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  font-weight: bold;
}

.step.active .step-number {
  background: #007bff;
  color: white;
}

.step.completed .step-number {
  background: #28a745;
  color: white;
}

.arrow {
  margin: 0 20px;
  font-size: 24px;
  color: #666;
}

.file-input {
  margin: 10px 0;
}

.image-preview {
  margin: 15px 0;
}

.preview-img {
  max-width: 200px;
  max-height: 200px;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.test-btn {
  display: block;
  width: 100%;
  margin: 10px 0;
  padding: 12px;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.step1-btn {
  background: #007bff;
  color: white;
}

.step2-btn {
  background: #28a745;
  color: white;
}

.full-btn {
  background: #6f42c1;
  color: white;
}

.test-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.results-section {
  margin: 20px 0;
}

.result-box {
  background: white;
  margin: 15px 0;
  padding: 15px;
  border-radius: 8px;
  border-left: 4px solid #007bff;
}

.result-box pre {
  background: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
  overflow-x: auto;
  font-size: 12px;
}

.result-image {
  margin-top: 15px;
  text-align: center;
}

.result-img {
  max-width: 400px;
  border-radius: 8px;
  border: 1px solid #ddd;
}

.logs-section {
  background: white;
  margin: 20px 0;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.log-container {
  max-height: 300px;
  overflow-y: auto;
  background: #1e1e1e;
  color: #fff;
  padding: 10px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
}

.log-entry {
  margin: 2px 0;
}

.log-time {
  color: #888;
  margin-right: 10px;
}

.clear-btn {
  margin-top: 10px;
  padding: 8px 16px;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
</style>
