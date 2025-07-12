<template>
  <div class="base-input" :class="{ 'is-focused': isFocused, 'has-error': hasError }">
    <div class="input-wrapper">
      <!-- 左侧图标 -->
      <div v-if="leftIcon" class="input-icon input-icon-left">
        <van-icon :name="leftIcon" size="16" />
      </div>

      <!-- 标签 -->
      <div v-if="label" class="input-label">
        {{ label }}
      </div>

      <!-- 输入框 -->
      <input
        ref="inputRef"
        v-model="inputValue"
        :type="inputType"
        :placeholder="placeholder"
        :disabled="disabled"
        :readonly="readonly"
        class="input-control"
        @focus="handleFocus"
        @blur="handleBlur"
        @input="handleInput"
        @keyup.enter="handleEnter"
      />

      <!-- 清除按钮 -->
      <div
        v-if="clearable && inputValue && !disabled && !readonly"
        class="input-icon input-icon-clear"
        @click="handleClear"
      >
        <van-icon name="clear" size="14" />
      </div>

      <!-- 密码显示切换 -->
      <div
        v-if="type === 'password'"
        class="input-icon input-icon-password"
        @click="togglePasswordVisibility"
      >
        <van-icon :name="showPassword ? 'eye-o' : 'closed-eye'" size="16" />
      </div>

      <!-- 右侧图标 -->
      <div v-if="rightIcon" class="input-icon input-icon-right">
        <van-icon :name="rightIcon" size="16" />
      </div>
    </div>

    <!-- 错误信息 -->
    <div v-if="errorMessage" class="input-error">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'

// Props
const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  type: {
    type: String,
    default: 'text'
  },
  label: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: ''
  },
  leftIcon: {
    type: String,
    default: ''
  },
  rightIcon: {
    type: String,
    default: ''
  },
  clearable: {
    type: Boolean,
    default: true
  },
  disabled: {
    type: Boolean,
    default: false
  },
  readonly: {
    type: Boolean,
    default: false
  },
  rules: {
    type: Array,
    default: () => []
  },
  validateTrigger: {
    type: String,
    default: 'blur' // 'blur', 'input', 'change'
  }
})

// Emits
const emit = defineEmits(['update:modelValue', 'focus', 'blur', 'input', 'clear', 'enter'])

// 响应式数据
const inputRef = ref(null)
const isFocused = ref(false)
const showPassword = ref(false)
const errorMessage = ref('')

// 计算属性
const inputValue = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const inputType = computed(() => {
  if (props.type === 'password') {
    return showPassword.value ? 'text' : 'password'
  }
  return props.type
})

const hasError = computed(() => !!errorMessage.value)

// 验证规则
const validateInput = async () => {
  errorMessage.value = ''
  
  if (!props.rules || props.rules.length === 0) {
    return true
  }

  for (const rule of props.rules) {
    if (typeof rule === 'function') {
      const result = await rule(inputValue.value)
      if (result !== true) {
        errorMessage.value = result
        return false
      }
    } else if (rule.required && !inputValue.value) {
      errorMessage.value = rule.message || '此字段为必填项'
      return false
    } else if (rule.pattern && !rule.pattern.test(inputValue.value)) {
      errorMessage.value = rule.message || '格式不正确'
      return false
    } else if (rule.min && inputValue.value.length < rule.min) {
      errorMessage.value = rule.message || `最少输入${rule.min}个字符`
      return false
    } else if (rule.max && inputValue.value.length > rule.max) {
      errorMessage.value = rule.message || `最多输入${rule.max}个字符`
      return false
    }
  }

  return true
}

// 事件处理
const handleFocus = (event) => {
  isFocused.value = true
  emit('focus', event)
}

const handleBlur = async (event) => {
  isFocused.value = false
  emit('blur', event)
  
  if (props.validateTrigger === 'blur') {
    await validateInput()
  }
}

const handleInput = async (event) => {
  emit('input', event)
  
  if (props.validateTrigger === 'input') {
    await validateInput()
  }
}

const handleClear = () => {
  inputValue.value = ''
  errorMessage.value = ''
  emit('clear')
  
  // 聚焦到输入框
  nextTick(() => {
    inputRef.value?.focus()
  })
}

const handleEnter = (event) => {
  emit('enter', event)
}

const togglePasswordVisibility = () => {
  showPassword.value = !showPassword.value
}

// 监听值变化
watch(() => props.modelValue, () => {
  if (props.validateTrigger === 'change') {
    validateInput()
  }
})

// 暴露方法
defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
  validate: validateInput,
  clearError: () => { errorMessage.value = '' }
})
</script>

<style scoped>
.base-input {
  margin-bottom: 16px;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  background: #ffffff;
  border: 1px solid #e1e5e9;
  border-radius: 12px;
  transition: all 0.3s ease;
  overflow: hidden;
  min-height: 48px;
}

.input-wrapper:hover {
  border-color: #1989fa;
  box-shadow: 0 2px 8px rgba(25, 137, 250, 0.1);
}

.base-input.is-focused .input-wrapper {
  border-color: #1989fa;
  box-shadow: 0 0 0 2px rgba(25, 137, 250, 0.1);
}

.base-input.has-error .input-wrapper {
  border-color: #ee0a24;
  box-shadow: 0 0 0 2px rgba(238, 10, 36, 0.1);
}

.input-label {
  flex-shrink: 0;
  padding: 0 16px;
  font-size: 14px;
  font-weight: 500;
  color: #646566;
  min-width: 60px;
  border-right: 1px solid #f0f0f0;
}

.input-control {
  flex: 1;
  padding: 12px 16px;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
  line-height: 1.4;
  color: #323233;
}

.input-control::placeholder {
  color: #c8c9cc;
  font-size: 14px;
}

.input-control:disabled {
  color: #c8c9cc;
  background: #f7f8fa;
  cursor: not-allowed;
}

.input-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 12px;
  color: #969799;
  cursor: pointer;
  transition: color 0.3s ease;
}

.input-icon:hover {
  color: #646566;
}

.input-icon-left {
  border-right: 1px solid #f0f0f0;
}

.input-icon-clear,
.input-icon-password {
  color: #c8c9cc;
}

.input-icon-clear:hover,
.input-icon-password:hover {
  color: #969799;
}

.input-error {
  margin-top: 4px;
  padding-left: 16px;
  font-size: 12px;
  color: #ee0a24;
  line-height: 1.4;
}

/* 禁用状态 */
.base-input .input-wrapper:has(.input-control:disabled) {
  background: #f7f8fa;
  border-color: #ebedf0;
  cursor: not-allowed;
}

.base-input .input-wrapper:has(.input-control:disabled):hover {
  border-color: #ebedf0;
  box-shadow: none;
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .input-wrapper {
    background: #2c2c2e;
    border-color: #3a3a3c;
  }

  .input-wrapper:hover {
    border-color: #1989fa;
  }

  .input-label {
    color: #8e8e93;
    border-right-color: #3a3a3c;
  }

  .input-control {
    color: #ffffff;
  }

  .input-control::placeholder {
    color: #6d6d70;
  }

  .input-control:disabled {
    color: #6d6d70;
    background: #1c1c1e;
  }

  .input-icon {
    color: #8e8e93;
  }

  .input-icon:hover {
    color: #ffffff;
  }
}
</style>
