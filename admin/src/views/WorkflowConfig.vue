<template>
  <div class="workflow-config-page">
    <div class="page-header">
      <h1 class="page-title">工作流节点配置</h1>
      <div class="header-actions">
        <el-button @click="loadConfig" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新配置
        </el-button>
        <el-button type="primary" @click="saveConfig" :loading="saving">
          <el-icon><Check /></el-icon>
          保存配置
        </el-button>
      </div>
    </div>

    <el-row :gutter="20">
      <!-- 换脸工作流配置 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>🔄 换脸工作流配置</span>
              <el-tag :type="config.faceswap.enabled ? 'success' : 'danger'" size="small">
                {{ config.faceswap.enabled ? '已启用' : '已禁用' }}
              </el-tag>
            </div>
          </template>

          <el-form
            :model="config.faceswap"
            label-width="140px"
            v-loading="loading"
          >
            <!-- 基础配置 -->
            <el-form-item label="启用状态">
              <el-switch v-model="config.faceswap.enabled" />
            </el-form-item>

            <el-form-item label="工作流名称">
              <el-input v-model="config.faceswap.name" placeholder="Face Swap 2.0" />
            </el-form-item>

            <el-form-item label="工作流描述">
              <el-input v-model="config.faceswap.description" placeholder="高质量人脸替换工作流" />
            </el-form-item>

            <el-divider content-position="left">输入节点配置</el-divider>

            <el-form-item label="人脸照片1节点">
              <el-input v-model="config.faceswap.input_nodes.face_photo_1" placeholder="670">
                <template #append>节点ID</template>
              </el-input>
            </el-form-item>

            <el-form-item label="人脸照片2节点">
              <el-input v-model="config.faceswap.input_nodes.face_photo_2" placeholder="662">
                <template #append>节点ID</template>
              </el-input>
            </el-form-item>

            <el-form-item label="人脸照片3节点">
              <el-input v-model="config.faceswap.input_nodes.face_photo_3" placeholder="658">
                <template #append>节点ID</template>
              </el-input>
            </el-form-item>

            <el-form-item label="人脸照片4节点">
              <el-input v-model="config.faceswap.input_nodes.face_photo_4" placeholder="655">
                <template #append>节点ID</template>
              </el-input>
            </el-form-item>

            <el-form-item label="目标图片节点">
              <el-input v-model="config.faceswap.input_nodes.target_image" placeholder="737">
                <template #append>节点ID</template>
              </el-input>
            </el-form-item>

            <el-divider content-position="left">输出节点配置</el-divider>

            <el-form-item label="主要输出节点">
              <el-input v-model="config.faceswap.output_nodes.primary" placeholder="812">
                <template #append>节点ID</template>
              </el-input>
            </el-form-item>

            <el-form-item label="备用输出节点">
              <el-input
                v-model="config.faceswap.output_nodes.secondary"
                placeholder="813,746,710"
                type="textarea"
                :rows="2"
              >
              </el-input>
              <div class="form-tip">多个节点ID用逗号分隔，按优先级排序</div>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>

      <!-- 一键褪衣工作流配置 -->
      <el-col :span="12">
        <el-card>
          <template #header>
            <div class="card-header">
              <span>👗 一键褪衣工作流配置</span>
              <el-tag :type="config.undress.enabled ? 'success' : 'danger'" size="small">
                {{ config.undress.enabled ? '已启用' : '已禁用' }}
              </el-tag>
            </div>
          </template>

          <el-form
            :model="config.undress"
            label-width="140px"
            v-loading="loading"
          >
            <!-- 基础配置 -->
            <el-form-item label="启用状态">
              <el-switch v-model="config.undress.enabled" />
            </el-form-item>

            <el-form-item label="工作流名称">
              <el-input v-model="config.undress.name" placeholder="Undress AI" />
            </el-form-item>

            <el-form-item label="工作流描述">
              <el-input v-model="config.undress.description" placeholder="一键褪衣AI工作流" />
            </el-form-item>

            <el-divider content-position="left">输入节点配置</el-divider>

            <el-form-item label="主图片节点">
              <el-input v-model="config.undress.input_nodes.main_image" placeholder="49">
                <template #append>节点ID</template>
              </el-input>
            </el-form-item>

            <el-form-item label="随机种子节点">
              <el-input v-model="config.undress.input_nodes.seed_node" placeholder="174">
                <template #append>节点ID</template>
              </el-input>
            </el-form-item>

            <el-divider content-position="left">输出节点配置</el-divider>

            <el-form-item label="主要输出节点">
              <el-input v-model="config.undress.output_nodes.primary" placeholder="730">
                <template #append>节点ID</template>
              </el-input>
            </el-form-item>

            <el-form-item label="备用输出节点">
              <el-input
                v-model="config.undress.output_nodes.secondary"
                placeholder="812,813,746,710"
                type="textarea"
                :rows="2"
              >
              </el-input>
              <div class="form-tip">多个节点ID用逗号分隔，按优先级排序</div>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>

    <!-- 配置说明 -->
    <el-card style="margin-top: 20px;">
      <template #header>
        <span>📖 配置说明</span>
      </template>
      <el-alert
        title="节点配置说明"
        type="info"
        :closable="false"
        show-icon
      >
        <ul>
          <li><strong>输入节点：</strong>指定哪些节点接收用户上传的图片</li>
          <li><strong>输出节点：</strong>指定哪些节点作为最终结果输出</li>
          <li><strong>主要输出节点：</strong>优先查找的输出节点</li>
          <li><strong>备用输出节点：</strong>当主要节点无输出时，按顺序查找的备用节点</li>
          <li><strong>节点ID：</strong>对应ComfyUI工作流JSON文件中的节点编号</li>
        </ul>
      </el-alert>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Check, Refresh } from '@element-plus/icons-vue'
import { getWorkflowConfig, getPublicWorkflowConfig, batchUpdateWorkflowConfig } from '@/api/workflow'

const loading = ref(false)
const saving = ref(false)

// 配置数据
const config = reactive({
  faceswap: {
    enabled: false, // 初始状态设为false，等待从服务器加载
    name: '',
    description: '',
    input_nodes: {
      face_photo_1: '',
      face_photo_2: '',
      face_photo_3: '',
      face_photo_4: '',
      target_image: ''
    },
    output_nodes: {
      primary: '',
      secondary: ''
    }
  },
  undress: {
    enabled: false, // 初始状态设为false，等待从服务器加载
    name: '',
    description: '',
    input_nodes: {
      main_image: '',
      seed_node: ''
    },
    output_nodes: {
      primary: '',
      secondary: ''
    }
  }
})

// 辅助函数：确保节点ID是字符串格式
const ensureStringNodeId = (nodeId) => {
  if (typeof nodeId === 'string') {
    // 如果已经是字符串，检查是否是JSON格式
    try {
      const parsed = JSON.parse(nodeId)
      // 如果能解析为JSON，说明可能是嵌套的JSON字符串，需要提取实际的nodeId
      if (parsed && typeof parsed === 'object' && parsed.nodeId) {
        return ensureStringNodeId(parsed.nodeId) // 递归处理嵌套情况
      }
      return nodeId // 如果解析后不是预期格式，返回原字符串
    } catch (e) {
      // 不是JSON格式，直接返回
      return nodeId
    }
  }
  return String(nodeId || '')
}

// 调试函数：检查当前状态
const debugCurrentState = () => {
  console.log('🔍 当前配置状态调试:')
  console.log('  换脸工作流 enabled:', config.faceswap.enabled, typeof config.faceswap.enabled)
  console.log('  一键褪衣工作流 enabled:', config.undress.enabled, typeof config.undress.enabled)
  console.log('  完整配置对象:', JSON.stringify({
    faceswap: { enabled: config.faceswap.enabled },
    undress: { enabled: config.undress.enabled }
  }, null, 2))
}

// 加载配置
const loadConfig = async () => {
  loading.value = true
  try {
    // 先尝试使用管理员API，如果失败则使用公开API
    let response
    try {
      response = await getWorkflowConfig()
    } catch (error) {
      console.warn('管理员API失败，尝试使用公开API:', error.message)
      response = await getPublicWorkflowConfig()
    }

    if (response.success && response.data) {
      const workflowData = response.data

      // 映射换脸工作流配置
      if (workflowData.faceswap) {
        const faceswap = workflowData.faceswap
        // 确保enabled状态正确设置
        config.faceswap.enabled = Boolean(faceswap.enabled)
        config.faceswap.name = faceswap.name || ''
        config.faceswap.description = faceswap.description || ''

        // 处理输入节点 - 确保节点ID是纯字符串格式
        config.faceswap.input_nodes.face_photo_1 = ensureStringNodeId(faceswap.inputNodes.face_photo_1) || '670'
        config.faceswap.input_nodes.face_photo_2 = ensureStringNodeId(faceswap.inputNodes.face_photo_2) || '662'
        config.faceswap.input_nodes.face_photo_3 = ensureStringNodeId(faceswap.inputNodes.face_photo_3) || '658'
        config.faceswap.input_nodes.face_photo_4 = ensureStringNodeId(faceswap.inputNodes.face_photo_4) || '655'
        config.faceswap.input_nodes.target_image = ensureStringNodeId(faceswap.inputNodes.target_image) || '737'

        // 处理输出节点
        const primaryOutput = faceswap.outputNodes.find(node => node.key === 'primary')
        config.faceswap.output_nodes.primary = ensureStringNodeId(primaryOutput?.nodeId) || '812'

        const secondaryOutputs = faceswap.outputNodes
          .filter(node => node.key.startsWith('secondary'))
          .sort((a, b) => a.order - b.order)
          .map(node => ensureStringNodeId(node.nodeId))
        config.faceswap.output_nodes.secondary = secondaryOutputs.join(',')

        console.log('🔄 换脸工作流状态已设置为:', config.faceswap.enabled)
      }

      // 映射一键褪衣工作流配置
      if (workflowData.undress) {
        const undress = workflowData.undress
        // 确保enabled状态正确设置
        config.undress.enabled = Boolean(undress.enabled)
        config.undress.name = undress.name || ''
        config.undress.description = undress.description || ''

        // 处理输入节点 - 确保节点ID是纯字符串格式
        config.undress.input_nodes.main_image = ensureStringNodeId(undress.inputNodes.main_image) || '49'
        config.undress.input_nodes.seed_node = ensureStringNodeId(undress.inputNodes.seed_node) || '174'

        // 处理输出节点
        const primaryOutput = undress.outputNodes.find(node => node.key === 'primary')
        config.undress.output_nodes.primary = ensureStringNodeId(primaryOutput?.nodeId) || '730'

        const secondaryOutputs = undress.outputNodes
          .filter(node => node.key.startsWith('secondary'))
          .sort((a, b) => a.order - b.order)
          .map(node => ensureStringNodeId(node.nodeId))
        config.undress.output_nodes.secondary = secondaryOutputs.join(',')

        console.log('👗 一键褪衣工作流状态已设置为:', config.undress.enabled)
      }

      ElMessage.success('配置加载成功')
      // 调试当前状态
      debugCurrentState()
    }
  } catch (error) {
    console.error('加载配置失败:', error)
    ElMessage.error('加载配置失败: ' + (error.message || '未知错误'))
  } finally {
    loading.value = false
  }
}

// 保存配置
const saveConfig = async () => {
  saving.value = true
  try {
    // 构建更新数据
    const workflows = {
      faceswap: {
        name: config.faceswap.name,
        description: config.faceswap.description,
        enabled: config.faceswap.enabled,
        inputNodes: {
          face_photo_1: ensureStringNodeId(config.faceswap.input_nodes.face_photo_1),
          face_photo_2: ensureStringNodeId(config.faceswap.input_nodes.face_photo_2),
          face_photo_3: ensureStringNodeId(config.faceswap.input_nodes.face_photo_3),
          face_photo_4: ensureStringNodeId(config.faceswap.input_nodes.face_photo_4),
          target_image: ensureStringNodeId(config.faceswap.input_nodes.target_image)
        },
        outputNodes: [
          {
            key: 'primary',
            nodeId: ensureStringNodeId(config.faceswap.output_nodes.primary),
            order: 1
          },
          ...config.faceswap.output_nodes.secondary.split(',').map((nodeId, index) => ({
            key: `secondary_${index + 1}`,
            nodeId: ensureStringNodeId(nodeId.trim()),
            order: index + 2
          })).filter(node => node.nodeId)
        ]
      },
      undress: {
        name: config.undress.name,
        description: config.undress.description,
        enabled: config.undress.enabled,
        inputNodes: {
          main_image: ensureStringNodeId(config.undress.input_nodes.main_image),
          seed_node: ensureStringNodeId(config.undress.input_nodes.seed_node)
        },
        outputNodes: [
          {
            key: 'primary',
            nodeId: ensureStringNodeId(config.undress.output_nodes.primary),
            order: 1
          },
          ...config.undress.output_nodes.secondary.split(',').map((nodeId, index) => ({
            key: `secondary_${index + 1}`,
            nodeId: ensureStringNodeId(nodeId.trim()),
            order: index + 2
          })).filter(node => node.nodeId)
        ]
      }
    }

    console.log('📊 准备保存的配置数据:', JSON.stringify(workflows, null, 2))

    const response = await batchUpdateWorkflowConfig({ workflows })
    if (response.success) {
      ElMessage.success('配置保存成功')
      console.log('💾 配置保存成功，重新加载配置以确保状态同步')
      // 保存成功后重新加载配置，确保显示最新数据
      await loadConfig()
      // 调试保存后的状态
      debugCurrentState()
    } else {
      throw new Error(response.message || '保存失败')
    }
  } catch (error) {
    console.error('保存配置失败:', error)
    ElMessage.error('保存配置失败: ' + (error.message || '未知错误'))
  } finally {
    saving.value = false
  }
}

// 监听状态变化，确保UI同步
watch(
  () => [config.faceswap.enabled, config.undress.enabled],
  ([faceswapEnabled, undressEnabled]) => {
    console.log('👀 状态变化监听 - 换脸:', faceswapEnabled, '一键褪衣:', undressEnabled)
    // 强制触发DOM更新
    nextTick(() => {
      console.log('🔄 DOM已更新，当前状态 - 换脸:', config.faceswap.enabled, '一键褪衣:', config.undress.enabled)
    })
  },
  { deep: true }
)

onMounted(() => {
  loadConfig()
})
</script>

<style scoped>
.workflow-config-page {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

:deep(.el-divider__text) {
  font-weight: 600;
  color: #409eff;
}
</style>
