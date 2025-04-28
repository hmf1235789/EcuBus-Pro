<template>
  <div style="margin: 20px">
    <formCreate
      v-model:api="fApi"
      :rule="panel.rule"
      :option="panel.options"
      @change="dataChange"
    ></formCreate>
  </div>
</template>
<script setup lang="ts">
import formCreate from '@form-create/element-ui'
import Grid from './panel-designer/components/grid/Grid.vue'
import { ref, computed, toRef, provide, inject, onMounted, onUnmounted, onBeforeMount } from 'vue'
import { useDataStore } from '@r/stores/data'
import { useProjectStore } from '@r/stores/project'
import LocalImage from './panel-designer/components/LocalImage.vue'
import { cloneDeep } from 'lodash'

const panels = useDataStore().panels
// formCreate.component('Grid', Grid)
// formCreate.component('LocalImage', LocalImage)

const props = defineProps<{
  height: number
  editIndex: string
}>()
const fApi = ref({})
const formData = ref({})

function dataChange(field: string, value: any, rule: any, api: any, setFlag: boolean) {
  console.log('data', field, value, rule, api, setFlag)
}
const panel = computed(() => {
  const index = props.editIndex.slice(1)
  return cloneDeep(panels[index] || {})
})
</script>
