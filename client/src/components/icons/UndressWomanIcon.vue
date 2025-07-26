<template>
  <SvgIcon
    name="undress-woman"
    :size="size"
    :color="color"
  />
</template>

<script setup>
import SvgIcon from './SvgIcon.vue'

defineProps({
  size: {
    type: [String, Number],
    default: 24
  },
  color: {
    type: String,
    default: '#ffffff'
  }
})
</script>
