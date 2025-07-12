<template>
  <div class="record-item">
    <div class="record-icon">
      <van-icon :name="actionIcon" size="20" :color="actionColor" />
    </div>
    <div class="record-info">
      <div class="record-desc">{{ description }}</div>
      <div class="record-time">{{ formatDate(createdAt) }}</div>
    </div>
    <div class="record-amount" :class="actionType">
      {{ actionType === 'consume' ? '-' : '+' }}{{ pointsAmount }}
    </div>
    <div class="record-actions">
      <van-button
        v-if="hasResult"
        type="primary"
        size="mini"
        plain
        @click="handleViewResult"
        :loading="loading"
      >
        查看结果
      </van-button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { Toast } from 'vant'

// Props
const props = defineProps({
  id: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  actionType: {
    type: String,
    required: true
  },
  pointsAmount: {
    type: Number,
    required: true
  },
  createdAt: {
    type: String,
    required: true
  },
  mediaUrl: {
    type: String,
    default: ''
  },
  loading: {
    type: Boolean,
    default: false
  }
})

// Emits
const emit = defineEmits(['view-result'])

// 计算是否有结果可查看
const hasResult = computed(() => {
  return props.actionType === 'consume' && props.mediaUrl
})

// 操作图标
const actionIcon = computed(() => {
  switch (props.actionType) {
    case 'consume':
      return 'minus'
    case 'bind':
      return 'plus'
    case 'purchase':
      return 'shopping-cart-o'
    default:
      return 'records'
  }
})

// 操作颜色
const actionColor = computed(() => {
  switch (props.actionType) {
    case 'consume':
      return '#ee0a24'
    case 'bind':
    case 'purchase':
      return '#28a745'
    default:
      return '#969799'
  }
})

// 格式化日期
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diff = now - date
  
  // 小于1分钟
  if (diff < 60000) {
    return '刚刚'
  }
  
  // 小于1小时
  if (diff < 3600000) {
    return `${Math.floor(diff / 60000)}分钟前`
  }
  
  // 小于1天
  if (diff < 86400000) {
    return `${Math.floor(diff / 3600000)}小时前`
  }
  
  // 小于7天
  if (diff < 604800000) {
    return `${Math.floor(diff / 86400000)}天前`
  }
  
  // 超过7天显示具体日期
  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 查看结果
const handleViewResult = () => {
  if (!hasResult.value) {
    Toast.fail('暂无结果可查看')
    return
  }
  
  emit('view-result', {
    id: props.id,
    description: props.description,
    mediaUrl: props.mediaUrl,
    createdAt: props.createdAt
  })
}
</script>

<style scoped>
.record-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #ffffff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  transition: all 0.3s ease;
  margin-bottom: 8px;
}

.record-item:hover {
  border-color: #e1e5e9;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.record-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: #f7f8fa;
  border-radius: 50%;
  flex-shrink: 0;
}

.record-info {
  flex: 1;
  min-width: 0;
}

.record-desc {
  font-size: 14px;
  font-weight: 500;
  color: #323233;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-time {
  font-size: 12px;
  color: #969799;
}

.record-amount {
  font-size: 16px;
  font-weight: 600;
  min-width: 60px;
  text-align: right;
}

.record-amount.consume {
  color: #ee0a24;
}

.record-amount.bind,
.record-amount.purchase {
  color: #28a745;
}

.record-actions {
  flex-shrink: 0;
  min-width: 70px;
  display: flex;
  justify-content: flex-end;
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .record-item {
    background: #2c2c2e;
    border-color: #3a3a3c;
  }

  .record-item:hover {
    border-color: #48484a;
  }

  .record-icon {
    background: #3a3a3c;
  }

  .record-desc {
    color: #ffffff;
  }

  .record-time {
    color: #8e8e93;
  }
}
</style>
