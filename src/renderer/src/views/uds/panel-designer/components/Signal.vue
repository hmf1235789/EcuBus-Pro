<template>
  <div class="_fd-struct">
    <el-badge type="warning" is-dot :hidden="!configured">
      <div @click="visible = true">
        <slot>
          <el-button class="_fd-plain-button" plain size="small">
            {{ title || t('signal.title') }}
            <template v-if="configured">({{ props.modelValue.name }})</template>
          </el-button>
        </slot>
      </div>
    </el-badge>
    <el-dialog
      class="_fd-struct-con"
      :title="title || t('signal.title')"
      v-model="visible"
      destroy-on-close
      :close-on-click-modal="false"
      align-center
      :append-to="dialogId"
      width="800px"
    >
      <xignal :height="height - 200" @add-signal="handleAddSignal" />
    </el-dialog>
  </div>
</template>

<script setup>
import { deepParseFn, toJSON } from '../utils/index'
import { deepCopy } from '@form-create/utils/lib/deepextend'
import { ref, computed, watch, nextTick, inject, defineProps, defineEmits } from 'vue'
import is from '@form-create/utils/lib/type'
import errorMessage from '../utils/message'
import xignal from '../../components/signal.vue'

const props = defineProps({
  modelValue: {
    type: [Object],
    default: () => ({})
  },
  title: String,
  defaultValue: {
    required: false
  },
  validate: Function
})

const emit = defineEmits(['update:modelValue'])

const designer = inject('designer')
const dialogId = inject('dialogId')
const height = inject('height')

const visible = ref(false)
const oldVal = ref(null)

const t = computed(() => designer.setupState.t)
const configured = computed(() => {
  console.log(props.modelValue)
  return !is.empty(props.modelValue) && Object.keys(props.modelValue).length > 0
})

const load = () => {
  const val = toJSON(
    deepParseFn(props.modelValue ? deepCopy(props.modelValue) : props.defaultValue)
  )
  oldVal.value = val
  nextTick(() => {
    // 原来这里是空的
  })
}
const handleAddSignal = (node) => {
  emit('update:modelValue', deepCopy(node))
  visible.value = false
}

watch(
  () => props.modelValue,
  () => {
    load()
  }
)

watch(visible, (n) => {
  if (n) {
    load()
  }
})
</script>

<style>
._fd-struct {
  width: 100%;
}

._fd-struct .el-badge {
  width: 100%;
}

._fd-struct .el-button {
  font-weight: 400;
  width: 100%;
  border-color: #2e73ff;
  color: #2e73ff;
}

._fd-struct-con .CodeMirror {
  height: 500px;
}

._fd-struct-con .el-dialog__body {
  padding: 0px;
}
</style>
