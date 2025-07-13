<template>
  <AIProcessingTemplate
    v-if="config.title"
    :title="config.title"
    :description="config.description"
    :title-icon="titleIcon"
    :title-icon-color="titleIconColor"
    :is-processing="isProcessing"
    :can-process="canProcess"
    :show-upload-tips="false"
    :process-button-text="config.processButtonText"
    :process-button-icon="processButtonIcon"
    :progress="progress"
    :processing-title="config.processingTitle"
    :processing-description="config.processingDescription"
    :processing-info="processingInfo"
    :result-data="resultData"
    @login="$emit('login', $event)"
    @logout="$emit('logout', $event)"
    @process="$emit('process')"
  >
    <!-- 输入区域 -->
    <template #inputs>
      <!-- 图片上传面板 -->
      <template v-if="config.uploadPanels">
        <UnifiedImageUploadPanel
          v-for="panel in config.uploadPanels"
          :key="panel.id"
          v-model="uploadData[panel.id]"
          :config="panel"
          :disabled="isProcessing"
          @change="handleUploadChange(panel.id, $event)"
        />
      </template>

      <!-- 文本输入面板 -->
      <template v-if="config.inputPanels">
        <div
          v-for="panel in config.inputPanels"
          :key="panel.id"
          class="input-panel"
        >
          <div class="panel-header">
            <van-icon
              :name="panel.icon"
              :color="panel.iconColor"
              size="18"
            />
            <span class="panel-title">{{ panel.title }}</span>
          </div>

          <van-field
            v-if="panel.type === 'text'"
            v-model="inputData[panel.id]"
            :placeholder="panel.placeholder"
            :rows="panel.rows"
            :maxlength="panel.maxLength"
            :disabled="isProcessing"
            type="textarea"
            show-word-limit
            autosize
            class="text-input"
            @input="handleInputChange(panel.id, $event)"
          />

          <!-- 提示信息 -->
          <div v-if="panel.tips && panel.tips.length > 0" class="tips-section">
            <div v-for="(tip, index) in panel.tips" :key="index" class="tip-item">
              <van-icon name="info-o" size="12" color="var(--van-text-color-3)" />
              <span>{{ tip }}</span>
            </div>
          </div>
        </div>
      </template>
    </template>



    <!-- 结果展示 -->
    <template #result="{ result }">
      <div v-if="config.resultConfig?.showComparison && config.resultConfig.comparisonType !== 'none'" class="comparison-result">
        <!-- 拖拽分割线对比组件 -->
        <ImageComparison
          v-if="config.resultConfig.comparisonType === 'slider'"
          :original-image="originalImageForComparison"
          :result-image="result"
        />

        <!-- 并排展示对比组件 -->
        <VantImageComparison
          v-else-if="config.resultConfig.comparisonType === 'side-by-side'"
          :original-image="originalImageForComparison"
          :result-image="result"
        />

        <!-- 操作按钮 -->
        <div class="result-actions">
          <van-button
            v-if="config.resultConfig?.downloadEnabled"
            type="primary"
            size="small"
            @click="$emit('download', result)"
          >
            下载图片
          </van-button>

          <van-button
            v-if="config.resultConfig?.resetEnabled"
            size="small"
            @click="$emit('reset')"
          >
            重新生成
          </van-button>
        </div>
      </div>

      <!-- 无对比的结果显示 -->
      <div v-else class="simple-result">
        <img :src="result" alt="处理结果" class="result-image" />

        <div class="result-actions">
          <van-button
            v-if="config.resultConfig?.downloadEnabled"
            type="primary"
            size="small"
            @click="$emit('download', result)"
          >
            下载图片
          </van-button>

          <van-button
            v-if="config.resultConfig?.resetEnabled"
            size="small"
            @click="$emit('reset')"
          >
            重新生成
          </van-button>
        </div>
      </div>
    </template>
  </AIProcessingTemplate>

  <!-- 配置加载中 -->
  <div v-else class="config-loading">
    <van-loading type="spinner" size="24" />
    <span>加载中...</span>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { Toast } from 'vant'
import {
  AIProcessingTemplate,
  VantImageComparison
} from '../mobile'
import ImageComparison from '../ImageComparison.vue'
import UnifiedImageUploadPanel from '../common/UnifiedImageUploadPanel.vue'
import { getImageProcessingConfig, fetchImageProcessingConfigFromAPI } from '../../config/imageProcessingConfigs.js'

// Props
const props = defineProps({
  functionId: {
    type: String,
    required: true
  },
  titleIcon: {
    type: [Object, String],
    default: null
  },
  titleIconColor: {
    type: String,
    default: 'var(--van-primary-color)'
  },
  processButtonIcon: {
    type: [Object, String],
    default: null
  },
  isProcessing: {
    type: Boolean,
    default: false
  },
  progress: {
    type: Number,
    default: 0
  },
  processingInfo: {
    type: Object,
    default: () => ({})
  },
  resultData: {
    type: String,
    default: null
  },
  originalImageForComparison: {
    type: String,
    default: null
  }
})

// Emits
const emit = defineEmits(['login', 'logout', 'process', 'reset', 'download', 'upload-change', 'input-change'])

// 响应式数据
const config = ref({
  title: '',
  description: '',
  processButtonText: '开始处理',
  processingTitle: '正在处理...',
  processingDescription: '请耐心等待',
  uploadPanels: [],
  inputPanels: [],
  resultConfig: {}
})
const uploadData = ref({})
const inputData = ref({})

// 计算属性
const canProcess = computed(() => {
  // 检查上传面板
  if (config.value.uploadPanels) {
    for (const panel of config.value.uploadPanels) {
      const data = uploadData.value[panel.id]
      if (panel.uploadType === 'single') {
        if (!data && panel.minCount > 0) return false
      } else {
        const count = Array.isArray(data) ? data.length : 0
        if (count < panel.minCount) return false
      }
    }
  }

  // 检查输入面板
  if (config.value.inputPanels) {
    for (const panel of config.value.inputPanels) {
      const data = inputData.value[panel.id]
      if (panel.required && (!data || data.trim() === '')) return false
    }
  }

  return true
})

// 方法
const loadConfig = async () => {
  try {
    const loadedConfig = await fetchImageProcessingConfigFromAPI(props.functionId)
    if (loadedConfig) {
      config.value = loadedConfig
      initializeData()
    } else {
      Toast.fail('加载配置失败')
    }
  } catch (error) {
    console.error('加载配置失败:', error)
    Toast.fail('加载配置失败')
  }
}

const initializeData = () => {
  // 初始化上传数据
  if (config.value.uploadPanels) {
    config.value.uploadPanels.forEach(panel => {
      uploadData.value[panel.id] = panel.uploadType === 'single' ? null : []
    })
  }

  // 初始化输入数据
  if (config.value.inputPanels) {
    config.value.inputPanels.forEach(panel => {
      inputData.value[panel.id] = ''
    })
  }
}

const handleUploadChange = (panelId, data) => {
  uploadData.value[panelId] = data
  emit('upload-change', panelId, data)
}

const handleInputChange = (panelId, data) => {
  inputData.value[panelId] = data
  emit('input-change', panelId, data)
}

// 状态相关方法


// 生命周期
onMounted(() => {
  loadConfig()
})

// 暴露数据给父组件
defineExpose({
  uploadData,
  inputData,
  config
})
</script>

<style scoped>
.input-panel {
  background: rgba(15, 15, 30, 0.6);
  border-radius: 12px;
  border: 1px solid rgba(30, 30, 60, 0.5);
  padding: 16px;
  margin-bottom: 16px;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  color: var(--van-text-color, #f7f8fa);
}

.panel-title {
  font-size: 16px;
  font-weight: 600;
}

.text-input {
  --van-field-background: rgba(255, 255, 255, 0.05);
  --van-field-border-color: rgba(255, 255, 255, 0.1);
  --van-field-text-color: var(--van-text-color);
}

.tips-section {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 12px;
}

.tip-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--van-text-color-3);
}



.comparison-result {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.simple-result {
  text-align: center;
}

.result-image {
  width: 100%;
  max-width: 400px;
  border-radius: 8px;
  margin-bottom: 16px;
}

.result-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

/* 配置加载状态 */
.config-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 12px;
  color: var(--van-text-color-2);
  font-size: 14px;
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  /* 深色主题样式 */
}
</style>

