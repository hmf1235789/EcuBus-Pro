<template>
  <div style="margin: 20px">
    <formCreate
      v-if="rule.length > 0"
      v-model:api="fApi"
      v-model="formData"
      :rule="rule"
      :option="options"
      @change="dataChange"
    ></formCreate>
  </div>
</template>
<script setup lang="ts">
import formCreate from '@form-create/element-ui'
import {
  ref,
  computed,
  toRef,
  provide,
  inject,
  onMounted,
  onUnmounted,
  onBeforeMount,
  watch,
  nextTick
} from 'vue'
import { useDataStore } from '@r/stores/data'
import { cloneDeep } from 'lodash'

const panels = useDataStore().panels
// formCreate.component('Grid', Grid)
// formCreate.component('LocalImage', LocalImage)

const props = defineProps<{
  height: number
  editIndex: string
}>()
const fApi = ref<any>({})
const formData = ref({})
const rule = ref<any[]>([])
const options = ref<any>({})

function dataChange(field: string, value: any, rule: any, api: any, setFlag: boolean) {
  // console.log('data', field, value, rule, api, setFlag)
}

let timer: any
onMounted(() => {
  const index = props.editIndex.slice(1)
  const panel = panels[index]
  if (panel) {
    rule.value = cloneDeep(panel.rule)
    options.value = cloneDeep(panel.options)
  }

  let count = 0
  nextTick(() => {
    fApi.value.setValue('F759ma0db5zhaec', 1)
  })
  // fApi.value.setValue({"F759ma0db5zhaec":1})
  timer = setInterval(() => {
    if (count % 2 == 0) {
      fApi.value.setValue('Fir1ma0gyjh1adc', '1')
      // console.log('1',formData.value)
    } else {
      // console.log('3')
      fApi.value.setValue('Fir1ma0gyjh1adc', '3')
      // console.log('1',formData.value)
    }
    count++
  }, 1000)
})

watch(formData, () => {
  // console.log('formData',formData.value)
})
onUnmounted(() => {
  clearInterval(timer)
})
</script>
