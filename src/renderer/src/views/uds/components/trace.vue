<template>
  <div>
    <div
      style="
        justify-content: flex-start;
        display: flex;
        align-items: center;
        gap: 2px;
        margin-left: 5px;
      "
    >
      <el-button-group>
        <el-tooltip effect="light" content="Clear Log" placement="bottom">
          <el-button type="danger" link @click="clearLog">
            <Icon :icon="circlePlusFilled" />
          </el-button>
        </el-tooltip>

        <!-- <el-tooltip effect="light" :content="autoScroll ? 'Disable Auto-Scroll' : 'Enable Auto-Scroll'" placement="bottom" >
                     <el-button :type="autoScroll ? 'success' : 'warning'" link @click="toggleAutoScroll">
                        <Icon :icon="autoScroll ? scrollIcon2 : scrollIcon1" />
                     </el-button>
                  </el-tooltip> -->
      </el-button-group>
      <el-tooltip effect="light" :content="isPaused ? 'Resume' : 'Pause'" placement="bottom">
        <el-button
          :type="isPaused ? 'success' : 'warning'"
          link
          :class="{ 'pause-active': isPaused }"
          @click="togglePause"
        >
          <Icon :icon="isPaused ? playIcon : pauseIcon" />
        </el-button>
      </el-tooltip>
      <el-divider v-if="showFilter" direction="vertical" />
      <el-dropdown v-if="showFilter">
        <span class="el-dropdown-link">
          <Icon :icon="filterIcon" />
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-checkbox-group v-model="checkList" size="small" style="width: 200px; margin: 10px">
              <el-checkbox
                v-for="item of LogFilter"
                :key="item.v"
                :label="item.label"
                :value="item.v"
                @change="filterChange(item.v, $event)"
              />
            </el-checkbox-group>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <el-divider direction="vertical" />
      <el-dropdown size="small">
        <el-button type="info" link @click="saveAll">
          <Icon :icon="saveIcon" />
        </el-button>

        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item>Save as raw</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
    <div :id="`traceTable-${props.editIndex}`" class="realLog"></div>
  </div>
</template>
<script lang="ts" setup>
import {
  ref,
  onMounted,
  onUnmounted,
  computed,
  toRef,
  watch,
  watchEffect,
  PropType,
  nextTick,
  handleError
} from 'vue'

import { CAN_ID_TYPE, CanMessage, CanMsgType, getDlcByLen } from 'nodeCan/can'
import { Icon } from '@iconify/vue'
import circlePlusFilled from '@iconify/icons-material-symbols/scan-delete-outline'
import email from '@iconify/icons-material-symbols/mark-email-unread-outline-rounded'
import emailFill from '@iconify/icons-material-symbols/mark-email-unread-rounded'
import systemIcon from '@iconify/icons-material-symbols/manage-accounts-outline'
import preStart from '@iconify/icons-material-symbols/line-start-rounded'
import sent from '@iconify/icons-material-symbols/start-rounded'
import recv from '@iconify/icons-material-symbols/line-start-arrow-outline'
import info from '@iconify/icons-material-symbols/info-outline'
import errorIcon from '@iconify/icons-material-symbols/chat-error-outline-sharp'
import filterIcon from '@iconify/icons-material-symbols/filter-alt-off-outline'
import saveIcon from '@iconify/icons-material-symbols/save'
import pauseIcon from '@iconify/icons-material-symbols/pause-circle-outline'
import playIcon from '@iconify/icons-material-symbols/play-circle-outline'
import scrollIcon1 from '@iconify/icons-material-symbols/autoplay'
import scrollIcon2 from '@iconify/icons-material-symbols/autopause'
import ExcelJS from 'exceljs'

import { ServiceItem, Sequence, getTxPduStr, getTxPdu } from 'nodeCan/uds'
import { useDataStore } from '@r/stores/data'
import { LinDirection, LinMsg } from 'nodeCan/lin'
import EVirtTable from 'e-virt-table'
import { ElLoading } from 'element-plus'
let allLogData: LogData[] = []
let logIndex = 0
interface LogData {
  index: string
  dir?: 'Tx' | 'Rx' | '--'
  data: string
  ts: string
  id?: string
  dlc?: number
  len?: number
  device: string
  channel: string
  msgType: string
  method: string
  name?: string
  seqIndex?: number
  children?: LogData[]
}

const database = useDataStore()
// const logData = ref<LogData[]>([])

interface CanBaseLog {
  method: 'canBase'
  data: CanMessage
}
interface IpBaseLog {
  method: 'ipBase'
  data: {
    dir: 'OUT' | 'IN'
    data: Uint8Array
    ts: number
    local: string
    remote: string
    type: 'udp' | 'tcp'
    name: string
  }
}
interface LinBaseLog {
  method: 'linBase'
  data: LinMsg
}

interface UdsLog {
  method: 'udsSent' | 'udsRecv' | 'udsNegRecv'
  id?: string
  data: { service: ServiceItem; ts: number; recvData?: Uint8Array; msg?: string }
}
interface UdsErrorLog {
  method: 'udsError' | 'udsScript' | 'udsSystem' | 'canError' | 'linEvent'
  data: { msg: string; ts: number }
}
interface LinErrorLog {
  method: 'linError'
  data: { msg: string; ts: number; data?: LinMsg }
}

interface LogItem {
  message: CanBaseLog | UdsLog | UdsErrorLog | IpBaseLog | LinBaseLog | LinErrorLog
  level: string
  instance: string
  label: string
}

watch(window.globalStart, (val) => {
  if (val) {
    clearLog()
    isPaused.value = false
  }
})

function clearLog() {
  allLogData = []
  logIndex = 0
  grid.loadData([])
}
function data2str(data: Uint8Array) {
  return data.reduce((acc, val) => acc + val.toString(16).padStart(2, '0') + ' ', '')
}
function CanMsgType2Str(msgType: CanMsgType) {
  let str = ''
  if (msgType.canfd) {
    str += 'CANFD '
  }
  if (msgType.remote) {
    str += 'REMOTE '
  }
  if (msgType.brs) {
    str += 'BRS '
  }
  if (msgType.idType == CAN_ID_TYPE.STANDARD) {
    str += 'STD'
  } else {
    str += 'EXT'
  }
  return str
}

const maxLogCount = 10000
function insertData2(data: LogData[]) {
  // grid.loadData(data)
  allLogData.push(...data)
  if (allLogData.length > maxLogCount) {
    const excessRows = allLogData.length - maxLogCount
    allLogData.splice(0, excessRows)
  }
  grid.loadData(allLogData)
  grid.scrollYTo(99999999999)
  // grid.scrollYTo(allLogData.length*28+100)
  // nextTick(() => {
  //   grid.scrollToRowIndex(logIndex - 1)
  // })
}
function logDisplay(vals: LogItem[]) {
  // Don't process logs when paused
  if (isPaused.value) return

  const logData: LogData[] = []
  const insertData = (data: LogData) => {
    logData.push(data)
  }
  for (const val of vals) {
    let children: LogData[] | undefined = []
    if (val.message.method == 'canBase') {
      if (val.message.data.database && val.message.data.name) {
        const fake: any = {}
        children = [fake]
      }
      insertData({
        index: String(logIndex++),
        method: val.message.method,
        dir: val.message.data.dir == 'OUT' ? 'Tx' : 'Rx',
        data: data2str(val.message.data.data),
        ts: ((val.message.data.ts || 0) / 1000000).toFixed(3),
        id: '0x' + val.message.data.id.toString(16),
        dlc: getDlcByLen(val.message.data.data.length, val.message.data.msgType.canfd),
        len: val.message.data.data.length,
        device: val.label,
        channel: val.instance,
        msgType: CanMsgType2Str(val.message.data.msgType),
        name: val.message.data.name,
        children: children
      })
    } else if (val.message.method == 'ipBase') {
      insertData({
        index: String(logIndex++),
        method: val.message.method,
        dir: val.message.data.dir == 'OUT' ? 'Tx' : 'Rx',
        data: data2str(val.message.data.data),
        ts: (val.message.data.ts / 1000000).toFixed(3),
        id: `${val.message.data.local}=>${val.message.data.remote}`,
        dlc: val.message.data.data.length,
        len: val.message.data.data.length,
        device: val.label,
        channel: val.instance,
        msgType: val.message.data.type.toLocaleUpperCase(),
        name: val.message.data.name,
        children: children
      })
    } else if (val.message.method == 'linBase') {
      if (val.message.data.database && val.message.data.name) {
        const fake: any = {}
        children = [fake]
      }
      insertData({
        index: String(logIndex++),
        method: val.message.method,
        dir: val.message.data.direction == LinDirection.SEND ? 'Tx' : 'Rx',
        data: data2str(val.message.data.data),
        ts: ((val.message.data.ts || 0) / 1000000).toFixed(3),
        id: '0x' + val.message.data.frameId.toString(16),
        len: val.message.data.data.length,
        device: val.label,
        channel: val.instance,
        msgType: `LIN ${val.message.data.checksumType}`,
        dlc: val.message.data.data.length,
        name: val.message.data.name,
        children: children
      })
    } else if (val.message.method == 'udsSent') {
      let testerName = val.message.data.service.name
      if (val.message.id) {
        testerName = `${database.tester[val.message.id]?.name}.${val.message.data.service.name}`
      }

      insertData({
        index: String(logIndex++),
        method: val.message.method,
        dir: '--',
        name: testerName,
        data: `${data2str(val.message.data.recvData ? val.message.data.recvData : new Uint8Array(0))}`.trim(),
        ts: (val.message.data.ts / 1000000).toFixed(3),
        id: '',
        len: val.message.data.recvData ? val.message.data.recvData.length : 0,
        device: val.label,
        channel: val.instance,
        msgType: 'UDS Req' + (val.message.data.msg || ''),
        children: children
      })
    } else if (val.message.method == 'udsRecv') {
      let testerName = val.message.data.service.name
      if (val.message.id) {
        testerName = `${database.tester[val.message.id]?.name}.${val.message.data.service.name}`
      }
      const data = val.message.data.recvData ? val.message.data.recvData : new Uint8Array(0)
      let method: string = val.message.method
      let msgType = 'UDS Resp' + (val.message.data.msg || '')

      if (data[0] == 0x7f) {
        method = 'udsNegRecv'
        msgType = 'UDS Negative Resp' + (val.message.data.msg || '')
      }
      insertData({
        index: String(logIndex++),
        method: method,
        dir: '--',
        name: testerName,
        data: `${data2str(val.message.data.recvData ? val.message.data.recvData : new Uint8Array(0))}`.trim(),
        ts: (val.message.data.ts / 1000000).toFixed(3),
        id: '',
        len: val.message.data.recvData ? val.message.data.recvData.length : 0,
        device: val.label,
        channel: val.instance,
        msgType: msgType,
        children: children
      })
    } else if (val.message.method == 'canError') {
      //find last udsSent or udsPreSend

      insertData({
        index: String(logIndex++),
        method: val.message.method,
        name: '',
        data: val.message.data.msg,
        ts: (val.message.data.ts / 1000000).toFixed(3),
        id: '',
        len: 0,
        device: val.label,
        channel: val.instance,
        msgType: 'CAN Error',
        children: children
      })
    } else if (val.message.method == 'linError') {
      if (val.message.data.data) {
        let method = 'linError'
        if (val.message.data.data?.isEvent || val.message.data.data?.frameId == 0x3d) {
          method = 'linWarning'
        }
        insertData({
          index: String(logIndex++),
          method: method,
          name: val.message.data.data.name,
          data: val.message.data.msg,
          ts: (val.message.data.ts / 1000000).toFixed(3),
          id: '0x' + val.message.data.data.frameId?.toString(16),
          len: val.message.data.data.data.length,
          dlc: val.message.data.data.data.length,
          dir: val.message.data.data.direction == LinDirection.SEND ? 'Tx' : 'Rx',
          device: val.label,
          channel: val.instance,
          msgType: 'LIN Error',
          children: children
        })
      } else {
        insertData({
          index: String(logIndex++),
          method: val.message.method,
          name: '',
          data: val.message.data.msg,
          ts: (val.message.data.ts / 1000000).toFixed(3),
          id: '',
          len: 0,
          device: val.label,
          channel: val.instance,
          msgType: 'LIN Error',
          children: children
        })
      }
    } else if (val.message.method == 'linEvent') {
      insertData({
        index: String(logIndex++),
        method: val.message.method,
        name: '',
        data: val.message.data.msg,
        ts: (val.message.data.ts / 1000000).toFixed(3),
        id: '',
        len: 0,
        device: val.label,
        channel: val.instance,
        msgType: 'LIN Event',
        children: children
      })
    } else if (val.message.method == 'udsScript') {
      insertData({
        index: String(logIndex++),
        method: val.message.method,
        name: '',
        data: val.message.data.msg,
        ts: (val.message.data.ts / 1000000).toFixed(3),
        id: '',
        len: 0,
        device: val.label,
        channel: val.instance,
        msgType: 'Script Message',
        children: children
      })
    } else if (val.message.method == 'udsSystem') {
      insertData({
        index: String(logIndex++),
        method: val.message.method,
        name: '',
        data: val.message.data.msg,
        ts: (val.message.data.ts / 1000000).toFixed(3),
        id: '',
        len: 0,
        device: val.label,
        channel: val.instance,
        msgType: 'System Message',
        children: children
      })
    }
  }
  insertData2(logData)
}

const props = defineProps({
  editIndex: {
    type: String,
    default: ''
  },
  width: {
    type: Number,
    required: true
  },
  height: {
    type: Number,
    required: true
  },
  showFilter: {
    type: Boolean,
    default: true
  },
  defaultCheckList: {
    type: Array as PropType<string[]>,
    default: () => ['canBase', 'ipBase', 'linBase', 'uds']
  }
})

// Initialize checkList with the prop value
const checkList = ref(props.defaultCheckList)

function filterChange(method: 'uds' | 'canBase' | 'ipBase' | 'linBase', val: boolean) {
  const i = LogFilter.value.find((v) => v.v == method)
  if (i) {
    i.value.forEach((v) => {
      window.logBus.detach(v, logDisplay)
      if (val) {
        window.logBus.on(v, logDisplay)
      }
    })
  }
}

const tableHeight = computed(() => {
  return props.height - 20
})
const tableWidth = computed(() => {
  return props.width
})

function saveAll() {
  isPaused.value = true
  const loadingInstance = ElLoading.service()

  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('Log Data')

  // Define columns
  worksheet.columns = [
    { header: 'Time', key: 'ts', width: 15 },
    { header: 'Name', key: 'name', width: 20 },
    { header: 'Data', key: 'data', width: 40 },
    { header: 'Dir', key: 'dir', width: 10 },
    { header: 'ID', key: 'id', width: 15 },
    { header: 'DLC', key: 'dlc', width: 10 },
    { header: 'Len', key: 'len', width: 10 },
    { header: 'Type', key: 'msgType', width: 15 },
    { header: 'Channel', key: 'channel', width: 15 },
    { header: 'Device', key: 'device', width: 20 }
  ]

  // Add data
  allLogData.forEach((log) => {
    worksheet.addRow(log)
  })

  // Style the header row
  worksheet.getRow(1).font = { bold: true }
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  }

  // Generate and download the file
  workbook.xlsx
    .writeBuffer()
    .then((buffer) => {
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `log_data_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.xlsx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    })
    .finally(() => {
      loadingInstance.close()
    })
}
const isPaused = ref(false)
// const autoScroll = ref(true)

function getData() {
  return allLogData
}

defineExpose({
  clearLog,
  insertData: insertData2,
  getData
})

function togglePause() {
  isPaused.value = !isPaused.value
}

const LogFilter = ref<
  {
    label: string
    v: 'uds' | 'canBase' | 'ipBase' | 'linBase'
    value: string[]
  }[]
>([
  {
    label: 'CAN',
    v: 'canBase',
    value: ['canBase', 'canError']
  },
  {
    label: 'LIN',
    v: 'linBase',
    value: ['linBase', 'linError', 'linWarning', 'linEvent']
  },
  {
    label: 'UDS',
    v: 'uds',
    value: ['udsSent', 'udsRecv']
  },
  {
    label: 'ETH',
    v: 'ipBase',
    value: ['ipBase', 'ipError']
  }
])

let grid: EVirtTable
let scrollY: number = -1
onMounted(() => {
  for (const item of checkList.value) {
    const v = LogFilter.value.find((v) => v.v == item)
    if (v) {
      for (const val of v.value) {
        window.logBus.on(val, logDisplay)
      }
    }
  }
  const target = document.getElementById(`traceTable-${props.editIndex}`)

  grid = new EVirtTable(target as any, {
    data: [],
    columns: [
      { key: 'ts', title: 'Time', width: 100, type: 'tree' },
      { key: 'name', title: 'Name', width: 200 },
      { key: 'data', title: 'Data', width: 300 },
      { key: 'dir', title: 'Dir', width: 50 },
      { key: 'id', title: 'ID', width: 100 },
      { key: 'dlc', title: 'DLC', width: 100 },
      { key: 'len', title: 'Len', width: 100 },
      { key: 'msgType', title: 'Type', width: 100 },
      { key: 'channel', title: 'Channel', width: 100 },
      { key: 'device', title: 'Device', width: 200 }
    ],
    config: {
      WIDTH: tableWidth.value,
      HEIGHT: tableHeight.value,
      DISABLED: true,
      HEADER_HEIGHT: 28,
      CELL_HEIGHT: 28,
      ENABLE_SELECTOR: false,
      ENABLE_HISTORY: false,
      ENABLE_COPY: false,
      ENABLE_PASTER: false,
      ENABLE_KEYBOARD: false,
      ENABLE_RESIZE_ROW: false,
      EMPTY_TEXT: 'No data',
      ROW_KEY: 'index',
      BODY_CELL_STYLE_METHOD: ({ row }) => {
        const method = row.method
        let color = ''
        switch (method) {
          case 'canBase':
            color = getComputedStyle(document.documentElement)
              .getPropertyValue('--el-color-primary')
              .trim()
            break
          case 'linEvent':
            color = getComputedStyle(document.documentElement)
              .getPropertyValue('--el-color-success')
              .trim()
            break
          case 'ipBase':
            color = getComputedStyle(document.documentElement)
              .getPropertyValue('--el-color-primary-dark-2')
              .trim()
            break
          case 'udsSent':
          case 'udsRecv':
            color = getComputedStyle(document.documentElement)
              .getPropertyValue('--el-color-info')
              .trim()
            break
          case 'canError':
          case 'linError':
          case 'ipError':
            color = getComputedStyle(document.documentElement)
              .getPropertyValue('--el-color-danger')
              .trim()
            break
          case 'linWarning':
          case 'udsWarning':
          case 'udsNegRecv':
            color = getComputedStyle(document.documentElement)
              .getPropertyValue('--el-color-warning')
              .trim()
            break
          case 'udsSystem':
            color = getComputedStyle(document.documentElement)
              .getPropertyValue('--el-color-primary')
              .trim()
            break
        }
        return {
          color: color
        }
      },
      EXPAND_LAZY: true,
      EXPAND_LAZY_METHOD: ({ row }) => {
        console.log(row)
        isPaused.value = true
        return Promise.resolve([])
      }
    }
  })

  grid.on('onScrollY', (v) => {
    if (!isPaused.value && scrollY !== -1 && v < scrollY) {
      isPaused.value = true
    } else {
      scrollY = v
    }
  })
})
watch([tableWidth, tableHeight], () => {
  grid.loadConfig({
    WIDTH: tableWidth.value,
    HEIGHT: tableHeight.value
  })
})

onUnmounted(() => {
  LogFilter.value.forEach((v) => {
    for (const val of v.value) {
      window.logBus.detach(val, logDisplay)
    }
  })
  // cTable.close()
  // stage.destroy()
  grid.destroy()
})
</script>

<style>
.canBase {
  color: var(--el-color-primary);
}

.linEvent {
  color: var(--el-color-success);
}

.ipBase {
  color: var(--el-color-primary-dark-2);
}

.udsSent {
  color: var(--el-color-info);
}

.udsRecv {
  color: var(--el-color-info);
}

.canError {
  color: var(--el-color-danger);
}

.linError {
  color: var(--el-color-danger);
}

.linWarning {
  color: var(--el-color-warning);
}

.ipError {
  color: var(--el-color-danger);
}

.udsSystem {
  color: var(--el-color-primary);
}

.udsWarning {
  color: var(--el-color-warning);
}

.udsNegRecv {
  color: var(--el-color-warning);
}

.pause-active {
  box-shadow: inset 0 0 4px var(--el-color-info-light-5);
  border-radius: 4px;
  background-color: rgba(0, 0, 0, 0.05);
}
</style>
