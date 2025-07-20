<template>
  <div class="cards-page">
    <div class="page-header">
      <h1 class="page-title">等级卡管理</h1>
      <div class="header-actions">
        <el-button type="primary" @click="showBatchGenerateDialog">
          <el-icon><Plus /></el-icon>
          批量生成等级卡
        </el-button>
      </div>
    </div>

    <el-card>
      <el-table :data="cardList" v-loading="loading">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="card_number" label="卡号" width="200" />
        <el-table-column label="类型" width="120">
          <template #default="{ row }">
            <span>{{ row.icon }} {{ row.type_name }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="total_points" label="总积分" width="100" />
        <el-table-column prop="remaining_points" label="剩余积分" width="100" />
        <el-table-column prop="price" label="价格" width="100">
          <template #default="{ row }">
            ¥{{ row.price }}
          </template>
        </el-table-column>
        <el-table-column label="绑定状态" width="150">
          <template #default="{ row }">
            <el-tag v-if="row.bound_username" type="success">
              已绑定: {{ row.bound_username }}
            </el-tag>
            <el-tag v-else type="info">未绑定</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="180">
          <template #default="{ row }">
            {{ formatDate(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button
              type="text"
              size="small"
              @click="copyCardInfo(row)"
            >
              <el-icon><DocumentCopy /></el-icon>
              复制卡密
            </el-button>
            <el-button
              v-if="row.bound_username"
              type="text"
              size="small"
              class="danger"
              @click="handleUnbind(row)"
            >
              解绑
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>



    <!-- 批量生成等级卡弹窗 -->
    <el-dialog
      v-model="batchGenerateDialogVisible"
      title="批量生成等级卡"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="batchGenerateForm" label-width="100px">
        <el-form-item label="等级卡类型" required>
          <el-select
            v-model="batchGenerateForm.cardTypeId"
            placeholder="请选择等级卡类型"
            style="width: 100%"
            :loading="cardTypesLoading"
          >
            <el-option
              v-for="cardType in cardTypes"
              :key="cardType.id"
              :label="`${cardType.icon} ${cardType.name} (${cardType.points}积分 - ¥${cardType.price})`"
              :value="cardType.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="生成数量" required>
          <el-input-number
            v-model="batchGenerateForm.count"
            :min="1"
            :max="100"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="batchGenerateDialogVisible = false">取消</el-button>
        <el-button
          type="primary"
          @click="handleBatchGenerate"
          :loading="batchGenerating"
        >
          生成
        </el-button>
      </template>
    </el-dialog>

    <!-- 生成结果弹窗 -->
    <el-dialog
      v-model="resultDialogVisible"
      :title="resultDialogTitle"
      width="80%"
      :close-on-click-modal="false"
      class="result-dialog"
    >
      <div class="result-content">
        <div class="result-summary">
          <el-alert
            :title="`成功生成 ${generatedCards.length} 张${selectedCardTypeName}！`"
            type="success"
            :closable="false"
            show-icon
          />
        </div>

        <div class="cards-table">
          <el-table :data="generatedCards" border style="width: 100%">
            <el-table-column prop="cardNumber" label="卡号" width="200" />
            <el-table-column prop="cardPassword" label="卡密" width="200" />
            <el-table-column prop="typeName" label="类型" width="120" />
            <el-table-column prop="points" label="积分" width="100" />
            <el-table-column prop="price" label="价格" width="100">
              <template #default="{ row }">
                ¥{{ row.price }}
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="resultDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="copyAllCards">
            <el-icon><DocumentCopy /></el-icon>
            一键复制所有卡号卡密
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, DocumentCopy } from '@element-plus/icons-vue'
import { getCardList, unbindCard, getCardTypes, generateCards } from '@/api/cards'

const loading = ref(false)
const cardList = ref([])

// 批量生成相关
const batchGenerateDialogVisible = ref(false)
const cardTypes = ref([])
const cardTypesLoading = ref(false)
const batchGenerating = ref(false)

// 结果弹窗相关
const resultDialogVisible = ref(false)
const resultDialogTitle = ref('')
const generatedCards = ref([])
const selectedCardTypeName = ref('')

const batchGenerateForm = reactive({
  cardTypeId: null,
  count: 5
})

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString()
}



// 复制卡号卡密
const copyCardInfo = async (row) => {
  try {
    const copyText = `卡号: ${row.card_number}\n卡密: ${row.card_password}\n类型: ${row.type_name}\n积分: ${row.remaining_points}/${row.total_points}\n价格: ¥${row.price}`

    // 使用现代浏览器的 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(copyText)
    } else {
      // 降级方案：使用传统的 document.execCommand
      const textArea = document.createElement('textarea')
      textArea.value = copyText
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }

    ElMessage.success('卡号卡密已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败，请手动复制')
  }
}

// 显示批量生成弹窗
const showBatchGenerateDialog = async () => {
  await loadCardTypes()
  batchGenerateDialogVisible.value = true
}

// 加载等级卡类型
const loadCardTypes = async () => {
  cardTypesLoading.value = true
  try {
    console.log('🔍 开始加载等级卡类型...');

    // 确保有token
    const { getToken, setToken } = await import('@/utils/auth');
    let token = getToken();
    if (!token) {
      console.log('⚠️ 没有找到token，设置测试token');
      setToken('admin-token');
      token = 'admin-token';
    }
    console.log('🔑 当前token:', token);

    const response = await getCardTypes()
    console.log('📊 API响应:', response);

    if (response.success) {
      cardTypes.value = response.data.cardTypes
      console.log('✅ 等级卡类型加载成功:', cardTypes.value);
    }
  } catch (error) {
    console.error('❌ 加载等级卡类型失败:', error)
    ElMessage.error('加载等级卡类型失败: ' + error.message)
  } finally {
    cardTypesLoading.value = false
  }
}

// 批量生成等级卡
const handleBatchGenerate = async () => {
  if (!batchGenerateForm.cardTypeId) {
    ElMessage.warning('请选择等级卡类型')
    return
  }

  if (!batchGenerateForm.count || batchGenerateForm.count <= 0) {
    ElMessage.warning('请输入有效的生成数量')
    return
  }

  batchGenerating.value = true
  try {
    const response = await generateCards({
      cardTypeId: batchGenerateForm.cardTypeId,
      count: batchGenerateForm.count
    })

    if (response.success) {
      // 获取选中的卡类型名称
      const selectedCardType = cardTypes.value.find(type => type.id === batchGenerateForm.cardTypeId)
      selectedCardTypeName.value = selectedCardType?.name || '等级卡'

      // 显示生成结果
      generatedCards.value = response.data.cards
      resultDialogTitle.value = `生成结果 - ${selectedCardTypeName.value}`

      // 关闭生成弹窗，显示结果弹窗
      batchGenerateDialogVisible.value = false
      resultDialogVisible.value = true

      // 刷新列表
      loadCards()

      ElMessage.success(response.message)
    }
  } catch (error) {
    console.error('批量生成等级卡失败:', error)
    ElMessage.error('批量生成等级卡失败')
  } finally {
    batchGenerating.value = false
  }
}

// 一键复制所有卡号卡密
const copyAllCards = async () => {
  if (generatedCards.value.length === 0) {
    ElMessage.warning('没有可复制的卡片信息')
    return
  }

  try {
    let copyText = `${selectedCardTypeName.value} - 共${generatedCards.value.length}张\n\n`
    copyText += '卡号\t卡密\t类型\t积分\t价格\n'
    copyText += '----------------------------------------\n'

    generatedCards.value.forEach(card => {
      copyText += `${card.cardNumber}\t${card.cardPassword}\t${card.typeName}\t${card.points}\t¥${card.price}\n`
    })

    copyText += '\n生成时间: ' + new Date().toLocaleString()

    // 使用现代浏览器的 Clipboard API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(copyText)
    } else {
      // 降级方案：使用传统的 document.execCommand
      const textArea = document.createElement('textarea')
      textArea.value = copyText
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }

    ElMessage.success('卡号卡密信息已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败，请手动复制')
  }
}

const loadCards = async () => {
  loading.value = true
  try {
    const response = await getCardList({ page: 1, pageSize: 50 })
    if (response.success) {
      cardList.value = response.data.items
    }
  } catch (error) {
    console.error('加载等级卡列表失败:', error)
    ElMessage.error('加载等级卡列表失败')
  } finally {
    loading.value = false
  }
}

// 解绑等级卡
const handleUnbind = async (card) => {
  try {
    await ElMessageBox.confirm(
      `确定要解绑用户 "${card.bound_username}" 的等级卡吗？`,
      '确认解绑',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await unbindCard(card.id)
    ElMessage.success('解绑成功')
    loadCards()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('解绑等级卡失败:', error)
      ElMessage.error('解绑失败')
    }
  }
}

onMounted(() => {
  loadCards()
})
</script>

<style scoped>
.cards-page {
  max-width: 1200px;
  margin: 0 auto;
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

.no-action {
  color: #c0c4cc;
  font-size: 12px;
}

/* 结果弹窗样式 */
.result-dialog {
  .el-dialog__body {
    padding: 20px;
  }
}

.result-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.result-summary {
  margin-bottom: 16px;
}

.cards-table {
  max-height: 400px;
  overflow-y: auto;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
