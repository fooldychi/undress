<template>
  <div class="config-page">
    <div class="page-header">
      <h1 class="page-title">系统配置</h1>
      <div class="header-actions">
        <el-button @click="testConnection" :loading="testing">
          <el-icon><Connection /></el-icon>
          测试连接
        </el-button>
        <el-button type="primary" @click="saveConfig" :loading="saving">
          <el-icon><Check /></el-icon>
          保存配置
        </el-button>
      </div>
    </div>

    <el-card>
      <template #header>
        <div class="card-header">
          <span>🖥️ ComfyUI服务器配置</span>
          <el-tag v-if="connectionStatus" :type="connectionStatus.type" size="small">
            {{ connectionStatus.text }}
          </el-tag>
        </div>
      </template>

      <el-form
        :model="config"
        :rules="rules"
        ref="configForm"
        label-width="180px"
        v-loading="loading"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="主服务器地址" prop="serverUrl" required>
              <el-input
                v-model="config.serverUrl"
                placeholder="https://your-comfyui-server.com"
                clearable
              >
                <template #prepend>HTTPS://</template>
              </el-input>
              <div class="form-tip">ComfyUI主服务器的完整地址</div>
            </el-form-item>

            <el-form-item label="备用服务器地址" prop="backupServers">
              <el-input
                v-model="config.backupServers"
                type="textarea"
                :rows="3"
                placeholder="https://backup1.example.com&#10;https://backup2.example.com"
                clearable
              />
              <div class="form-tip">每行一个备用服务器地址，主服务器不可用时自动切换</div>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="请求超时时间" prop="requestTimeout" required>
              <el-input-number
                v-model="config.requestTimeout"
                :min="5000"
                :max="600000"
                :step="1000"
                style="width: 100%"
              />
              <div class="form-tip">单位：毫秒，建议设置为30000-300000</div>
            </el-form-item>

            <el-form-item label="健康检查超时时间" prop="healthCheckTimeout" required>
              <el-input-number
                v-model="config.healthCheckTimeout"
                :min="1000"
                :max="30000"
                :step="1000"
                style="width: 100%"
              />
              <div class="form-tip">单位：毫秒，建议设置为5000-15000</div>
            </el-form-item>

            <el-form-item label="自动切换备用服务器">
              <el-switch
                v-model="config.autoSwitch"
                active-text="启用"
                inactive-text="禁用"
              />
              <div class="form-tip">主服务器故障时自动切换到备用服务器</div>
            </el-form-item>
          </el-col>
        </el-row>

        <el-divider content-position="left">高级设置</el-divider>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="客户端ID" prop="clientId">
              <el-input
                v-model="config.clientId"
                placeholder="your-comfyui-client-id"
                clearable
              />
              <div class="form-tip">ComfyUI客户端标识符（可选）</div>
            </el-form-item>
          </el-col>

          <el-col :span="12">
            <el-form-item label="最大重试次数" prop="maxRetries">
              <el-input-number
                v-model="config.maxRetries"
                :min="0"
                :max="10"
                style="width: 100%"
              />
              <div class="form-tip">请求失败时的最大重试次数</div>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Connection } from '@element-plus/icons-vue'
import { getSystemConfig, saveSystemConfig, testComfyUIConnection } from '@/api/config'

const loading = ref(false)
const saving = ref(false)
const testing = ref(false)
const configForm = ref(null)
const connectionStatus = ref(null)

// 配置数据
const config = reactive({
  serverUrl: '',
  backupServers: '',
  requestTimeout: 30000,
  healthCheckTimeout: 10000,
  autoSwitch: true,
  clientId: '',
  maxRetries: 3
})

// 表单验证规则
const rules = {
  serverUrl: [
    { required: true, message: '请输入主服务器地址', trigger: 'blur' },
    {
      pattern: /^https?:\/\/.+/,
      message: '请输入有效的URL地址',
      trigger: 'blur'
    }
  ],
  requestTimeout: [
    { required: true, message: '请设置请求超时时间', trigger: 'blur' },
    {
      type: 'number',
      min: 5000,
      max: 600000,
      message: '请求超时时间应在5000-600000毫秒之间',
      trigger: 'blur'
    }
  ],
  healthCheckTimeout: [
    { required: true, message: '请设置健康检查超时时间', trigger: 'blur' },
    {
      type: 'number',
      min: 1000,
      max: 30000,
      message: '健康检查超时时间应在1000-30000毫秒之间',
      trigger: 'blur'
    }
  ]
}

// 加载配置
const loadConfig = async () => {
  loading.value = true
  try {
    const response = await getSystemConfig()
    if (response.success && response.data) {
      const configData = response.data

      // 映射配置数据到表单
      config.serverUrl = configData['comfyui.server_url'] || ''
      config.backupServers = configData['comfyui.backup_servers'] || ''
      config.requestTimeout = parseInt(configData['comfyui.request_timeout']) || 30000
      config.healthCheckTimeout = parseInt(configData['comfyui.health_check_timeout']) || 10000
      config.autoSwitch = configData['comfyui.auto_switch'] === 'true' || configData['comfyui.auto_switch'] === true
      config.clientId = configData['comfyui.client_id'] || ''
      config.maxRetries = parseInt(configData['comfyui.max_retries']) || 3

      ElMessage.success('配置加载成功')
    }
  } catch (error) {
    console.error('加载配置失败:', error)
    ElMessage.error('加载配置失败')
  } finally {
    loading.value = false
  }
}

// 保存配置
const saveConfig = async () => {
  if (!configForm.value) return

  try {
    await configForm.value.validate()
  } catch (error) {
    ElMessage.warning('请检查表单输入')
    return
  }

  saving.value = true
  try {
    // 构建配置数据
    const configs = [
      {
        config_key: 'comfyui.server_url',
        config_value: config.serverUrl,
        config_type: 'string',
        config_group: 'comfyui'
      },
      {
        config_key: 'comfyui.backup_servers',
        config_value: config.backupServers,
        config_type: 'string',
        config_group: 'comfyui'
      },
      {
        config_key: 'comfyui.request_timeout',
        config_value: config.requestTimeout.toString(),
        config_type: 'number',
        config_group: 'comfyui'
      },
      {
        config_key: 'comfyui.health_check_timeout',
        config_value: config.healthCheckTimeout.toString(),
        config_type: 'number',
        config_group: 'comfyui'
      },
      {
        config_key: 'comfyui.auto_switch',
        config_value: config.autoSwitch.toString(),
        config_type: 'boolean',
        config_group: 'comfyui'
      },
      {
        config_key: 'comfyui.client_id',
        config_value: config.clientId,
        config_type: 'string',
        config_group: 'comfyui'
      },
      {
        config_key: 'comfyui.max_retries',
        config_value: config.maxRetries.toString(),
        config_type: 'number',
        config_group: 'comfyui'
      }
    ]

    const response = await saveSystemConfig(configs)
    if (response.success) {
      ElMessage.success('配置保存成功')
      connectionStatus.value = null // 重置连接状态
    } else {
      ElMessage.error(response.message || '配置保存失败')
    }
  } catch (error) {
    console.error('保存配置失败:', error)
    ElMessage.error('保存配置失败')
  } finally {
    saving.value = false
  }
}

// 测试连接
const testConnection = async () => {
  if (!config.serverUrl) {
    ElMessage.warning('请先输入主服务器地址')
    return
  }

  testing.value = true
  connectionStatus.value = { type: 'warning', text: '测试中...' }

  try {
    const response = await testComfyUIConnection(config.serverUrl, config.healthCheckTimeout)

    if (response.success) {
      connectionStatus.value = { type: 'success', text: '连接正常' }
      ElMessage.success(response.message || 'ComfyUI服务器连接测试成功')
    } else {
      connectionStatus.value = { type: 'danger', text: '连接失败' }
      ElMessage.error(response.message || 'ComfyUI服务器连接测试失败')
    }
  } catch (error) {
    console.error('连接测试失败:', error)
    connectionStatus.value = { type: 'danger', text: '连接失败' }
    ElMessage.error('ComfyUI服务器连接测试失败')
  } finally {
    testing.value = false
  }
}

// 页面加载时获取配置
onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.config-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-input-group__prepend) {
  background-color: #f5f7fa;
  color: #909399;
  border-color: #dcdfe6;
}

:deep(.el-divider__text) {
  font-weight: 500;
  color: #606266;
}

.el-card {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  border-radius: 8px;
}
</style>
