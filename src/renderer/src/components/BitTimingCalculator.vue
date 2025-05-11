<template>
  <el-dialog
    v-if="dialogVisible"
    v-model="dialogVisible"
    :title="`Bit Timing Configuration: ${form.bitRate} kbit/s @ ${form.clockFreq} MHz`"
    width="80%"
    align-center
    append-to="#winhardware"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
  >
    <el-table
      empty-text="No results, try change the clock frequency"
      :data="results"
      style="width: 100%"
      border
      size="small"
      :height="props.height - 100"
      highlight-current-row
      :current-row="selectedRow"
      @current-change="handleCurrentChange"
    >
      <el-table-column type="index" width="40" label="#" :resizable="false" align="center" />
      <el-table-column prop="sp" label="Sample Point (%)" width="140" sortable :resizable="false" />
      <el-table-column prop="presc" label="Prescaler" width="100" sortable :resizable="false" />
      <el-table-column prop="t1" label="TSEG1" width="90" sortable :resizable="false" />
      <el-table-column prop="t2" label="TSEG2" width="90" sortable :resizable="false" />
      <el-table-column prop="tq" label="tq (ns)" :resizable="false" />
      <el-table-column prop="btq" label="Nq" :resizable="false" />
    </el-table>

    <template #footer>
      <span class="dialog-footer">
        <el-button type="primary" :disabled="!selectedRow" size="small" plain @click="onOk"
          >OK</el-button
        >
        <el-button size="small" @click="dialogVisible = false">Cancel</el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script lang="ts" setup>
import { ref, defineModel, defineEmits, onMounted } from 'vue'

interface CalculatorResult {
  t1: number
  t2: number
  btq: number
  sp: number
  sjw: number
  presc: number
  tq: number
}

const props = defineProps<{
  freq: number
  clock: number
  height: number
}>()
const dialogVisible = defineModel<boolean>('modelValue')
const emit = defineEmits<{
  (
    e: 'result',
    result: { t1: number; t2: number; sjw: number; presc: number; bitRate: number }
  ): void
}>()

const form = ref({
  clockFreq: props.clock,
  bitRate: props.freq / 1000
})

const results = ref<CalculatorResult[]>([])
const selectedRow = ref<CalculatorResult | null>(null)

function calculate() {
  const clock = form.value.clockFreq * 1000000
  const bitrate = form.value.bitRate * 1000

  let matches = 0
  let exactMatches = 0
  const newResults: CalculatorResult[] = []

  const tmp = clock / bitrate / 2
  const maxPrescaler = 64

  for (let presc = 1; presc <= maxPrescaler; presc++) {
    const tmp2 = tmp / presc
    const btq = Math.round(tmp2)
    if (btq >= 4 && btq <= 32) {
      const err = -(tmp2 / btq - 1)

      for (let t1 = 3; t1 < 18; t1++) {
        const t2 = btq - t1
        if (t1 < t2 || t2 > 8 || t2 < 2) continue
        for (let sjw = 1; sjw <= 4; sjw++) {
          const tq = Math.round((1e9 / clock) * presc)
          const result: CalculatorResult = {
            t1,
            t2,
            btq,
            sp: Math.round((t1 / btq) * 10000) / 100,
            sjw,
            presc,
            tq
          }

          newResults.push(result)
          matches++
          if (err === 0) exactMatches++
        }
      }
    }
  }

  results.value = newResults
}

function handleCurrentChange(row: CalculatorResult) {
  selectedRow.value = row
}

function onOk() {
  if (selectedRow.value) {
    emit('result', {
      t1: selectedRow.value.t1,
      t2: selectedRow.value.t2,
      sjw: selectedRow.value.sjw,
      presc: selectedRow.value.presc,
      bitRate: selectedRow.value.btq * 1000
    })
    dialogVisible.value = false
  }
}

onMounted(() => {
  calculate()
})
</script>

<style scoped>
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
