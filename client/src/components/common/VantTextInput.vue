<template>
  <div class="vant-text-input">
    <MobileCard :title="title" inset>
      <!-- 文本输入区域 -->
      <van-field
        v-model="inputValue"
        type="textarea"
        :placeholder="placeholder"
        :rows="rows"
        :maxlength="maxLength"
        :disabled="disabled"
        :show-word-limit="showWordLimit"
        :autosize="autosize"
        class="text-input-field"
      />

      <!-- 示例提示词 -->
      <div v-if="showExamples && examples.length > 0" class="examples-section">
        <div class="examples-header">
          <van-icon name="bulb-o" size="16" color="var(--van-warning-color)" />
          <span class="examples-title">示例提示词</span>
        </div>

        <div class="examples-grid">
          <van-tag
            v-for="(example, index) in examples"
            :key="index"
            type="default"
            size="medium"
            round
            @click="selectExample(example)"
            class="example-tag"
          >
            {{ example }}
          </van-tag>
        </div>
      </div>

      <!-- 选项配置 -->
      <div v-if="showOptions && options.length > 0" class="options-section">
        <van-cell-group inset>
          <van-cell
            v-for="option in options"
            :key="option.key"
            :title="option.label"
            :value="getOptionValue(option)"
            is-link
            @click="showOptionPicker(option)"
          />
        </van-cell-group>
      </div>
    </MobileCard>

    <!-- 选项选择器 -->
    <van-popup
      v-model:show="showPicker"
      position="bottom"
      :style="{ height: '40%' }"
    >
      <van-picker
        v-if="currentOption"
        :columns="currentOption.options"
        :default-index="getCurrentOptionIndex()"
        @confirm="onOptionConfirm"
        @cancel="showPicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { MobileCard } from '../mobile'

// Props
const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  title: {
    type: String,
    default: '输入描述'
  },
  placeholder: {
    type: String,
    default: '请输入描述内容...'
  },
  rows: {
    type: Number,
    default: 4
  },
  maxLength: {
    type: Number,
    default: 500
  },
  disabled: {
    type: Boolean,
    default: false
  },
  showWordLimit: {
    type: Boolean,
    default: true
  },
  autosize: {
    type: [Boolean, Object],
    default: true
  },
  showExamples: {
    type: Boolean,
    default: true
  },
  examples: {
    type: Array,
    default: () => []
  },
  showOptions: {
    type: Boolean,
    default: false
  },
  options: {
    type: Array,
    default: () => []
  },
  optionValues: {
    type: Object,
    default: () => ({})
  }
})

// Events
const emit = defineEmits(['update:modelValue', 'update:optionValues', 'change', 'option-change'])

// Data
const inputValue = ref('')
const showPicker = ref(false)
const currentOption = ref(null)
const localOptionValues = ref({})

// Watch
watch(() => props.modelValue, (newValue) => {
  inputValue.value = newValue
}, { immediate: true })

watch(inputValue, (newValue) => {
  emit('update:modelValue', newValue)
  emit('change', newValue)
})

watch(() => props.optionValues, (newValue) => {
  localOptionValues.value = { ...newValue }
}, { immediate: true, deep: true })

watch(localOptionValues, (newValue) => {
  emit('update:optionValues', newValue)
  emit('option-change', newValue)
}, { deep: true })

// Methods
const selectExample = (example) => {
  inputValue.value = example
}

const getOptionValue = (option) => {
  const value = localOptionValues.value[option.key]
  if (!value) return option.defaultValue || '请选择'

  const optionItem = option.options.find(item =>
    typeof item === 'string' ? item === value : item.value === value
  )

  return typeof optionItem === 'string' ? optionItem : optionItem?.text || value
}

const showOptionPicker = (option) => {
  currentOption.value = option
  showPicker.value = true
}

const getCurrentOptionIndex = () => {
  if (!currentOption.value) return 0

  const value = localOptionValues.value[currentOption.value.key]
  if (!value) return 0

  return currentOption.value.options.findIndex(item =>
    typeof item === 'string' ? item === value : item.value === value
  )
}

const onOptionConfirm = ({ selectedOptions }) => {
  if (!currentOption.value || !selectedOptions[0]) return

  const selectedValue = typeof selectedOptions[0] === 'string'
    ? selectedOptions[0]
    : selectedOptions[0].value

  localOptionValues.value[currentOption.value.key] = selectedValue
  showPicker.value = false
}
</script>

<style scoped>
.vant-text-input {
  width: 100%;
}

.text-input-field {
  --van-field-input-text-color: rgba(255, 255, 255, 0.9);
  --van-field-placeholder-text-color: rgba(255, 255, 255, 0.6);
  --van-field-background: rgba(255, 255, 255, 0.1);
  --van-field-border-color: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
}

.examples-section {
  margin-top: 20px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

.examples-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.examples-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.examples-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.example-tag {
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: rgba(255, 255, 255, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.example-tag:hover {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.4);
  color: rgba(255, 255, 255, 0.95);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.options-section {
  margin-top: 20px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);
}

/* 移动端优化 */
@media (max-width: 768px) {
  .examples-section,
  .options-section {
    padding: 12px;
    margin-top: 16px;
  }

  .examples-title {
    font-size: 14px;
  }

  .examples-grid {
    gap: 8px;
  }

  .example-tag {
    font-size: 12px;
    padding: 6px 10px;
  }
}

/* 深色主题适配 */
@media (prefers-color-scheme: dark) {
  .text-input-field {
    --van-field-input-text-color: rgba(255, 255, 255, 0.9);
    --van-field-placeholder-text-color: rgba(255, 255, 255, 0.5);
    --van-field-background: rgba(0, 0, 0, 0.3);
    --van-field-border-color: rgba(255, 255, 255, 0.1);
  }

  .examples-section,
  .options-section {
    background: rgba(0, 0, 0, 0.2);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .example-tag {
    background: rgba(0, 0, 0, 0.3);
    border-color: rgba(255, 255, 255, 0.1);
  }

  .example-tag:hover {
    background: rgba(0, 0, 0, 0.4);
    border-color: rgba(255, 255, 255, 0.2);
  }
}

/* 减少动画在低性能设备上的影响 */
@media (prefers-reduced-motion: reduce) {
  .example-tag {
    transition: none;
  }

  .example-tag:hover {
    transform: none;
  }
}
</style>
