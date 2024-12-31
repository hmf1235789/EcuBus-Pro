<template>
   <div>
      <VxeGrid ref="xGrid" v-bind="gridOptions" class="sequenceTable" @menu-click="menuClick" :height="tableHeight">
         <template #default_type="{ row }">
            <Icon :icon="email" v-if="row.method == 'canBase'||row.method=='ipBase'" style="font-size: 14px" />
            <Icon :icon="emailFill" v-else-if="row.method == 'udsSent' || row.method == 'udsRecv'|| row.method =='udsNegRecv' "
               style="font-size: 14px" />
            <Icon :icon="systemIcon" v-else-if="row.method == 'udsSystem'" style="font-size: 14px" />
            <Icon :icon="errorIcon" v-else style="font-size: 14px" />
         </template>
         <template #toolbar>
            <div style="justify-content: flex-start;display: flex;align-items: center;gap:2px;margin-left: 5px">
               <el-button-group>
                  <el-tooltip effect="light" content="Clear Log" placement="bottom" :show-after="1000">
                     <el-button type="danger" link @click="clearLog">
                        <Icon :icon="circlePlusFilled" />
                     </el-button>
                  </el-tooltip>
               </el-button-group>
               <el-divider direction="vertical" />
               <el-dropdown>
                  <span class="el-dropdown-link">
                     <Icon :icon="filterIcon" />
                  </span>
                  <template #dropdown>
                     <el-dropdown-menu>
                        <el-checkbox-group v-model="checkList" size="small" style="width: 200px;margin:10px">
                           <el-checkbox label="CAN" value="canBase" @change="filterChange('canBase', $event)" />
                           <el-checkbox label="LIN" value="linBase" @change="filterChange('linBase', $event)" />
                           <el-checkbox label="UDS" value="uds" @change="filterChange('uds', $event)" />
                           <el-checkbox label="ETH" value="ipBase" @change="filterChange('ipBase', $event)" />

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
         </template>
      </VxeGrid>
   </div>
</template>
<script lang="ts" setup>
import { ref, onMounted, onUnmounted, computed, toRef, watch, watchEffect } from 'vue'

import { CAN_ID_TYPE, CanMsgType, getDlcByLen } from 'nodeCan/can';
import { VxeGridProps } from 'vxe-table'
import { VxeGrid } from 'vxe-table'
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


import { ServiceItem, Sequence, getTxPduStr, getTxPdu } from 'nodeCan/uds';
import { useDataStore } from '@r/stores/data';
import { LinDirection, LinMsg } from 'nodeCan/lin';


interface LogData {
   dir?: 'Tx' | 'Rx'|'--',
   data: string,
   ts: string,
   id?: string,
   dlc?: number,
   len?: number,
   device: string,
   channel: string,
   msgType: string,
   method: string
   name?: string,
   seqIndex?: number

}

const database=useDataStore()
const xGrid = ref()
// const logData = ref<LogData[]>([])
const checkList = ref<string[]>([
   'canBase',
   'ipBase',
   'linBase',
   'uds',
])
interface CanBaseLog {
   method: 'canBase',
   data: { dir: 'OUT' | 'IN'; data: Uint8Array; ts: number; id: number; msgType: CanMsgType }
}
interface IpBaseLog {
   method: 'ipBase',
   data: { dir: 'OUT' | 'IN'; data: Uint8Array; ts: number; local:string,remote:string ,type:'udp'|'tcp',name:string}
}
interface LinBaseLog {
   method: 'linBase',
   data: LinMsg|'busSleep'|'busWakeUp',
   ts: number
}
interface UdsLog {
   method: 'udsSent' | 'udsRecv' | 'udsNegRecv',
   id?: string,
   data: { service: ServiceItem, ts: number,  recvData?: Uint8Array, msg?: string }
}
interface UdsErrorLog {
   method: 'udsError' | 'udsScript' | 'udsSystem' | 'canError',
   data: { msg: string, ts: number}
}
interface LinErrorLog{
   method: 'linError',
   data: { msg: string, ts: number,data?:LinMsg}
}

interface LogItem {
   message: CanBaseLog | UdsLog | UdsErrorLog|IpBaseLog|LinBaseLog|LinErrorLog,
   level: string,
   instance: string,
   label: string,
}

watch(window.globalStart,(val)=>{
    if(val){
        clearLog()
    }
})
function clearLog() {
   // logData.value = []
   xGrid.value?.remove()

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
function insertData1(data: LogData[]) {
   xGrid.value.insertAt(data, -1).then((v: any) => {


      xGrid.value.scrollToRow(v.row)

   })
}

let logList: LogItem[] = []
function _logDisplay(vals: LogItem[]) {
   const logData: LogData[] = []
   const insertData = (data: LogData) => {
      logData.push(data)

   }
   for (const val of vals) {
      if (val.message.method == 'canBase') {
        
         let name=''
         if(val.message.data.msgType.uuid){
            const node=database.nodes[val.message.data.msgType.uuid]
            if(node){
               name=node.name
            }
         }
         insertData({
            method: val.message.method,
            dir: val.message.data.dir == 'OUT' ? 'Tx' : 'Rx',
            data: data2str(val.message.data.data),
            ts: (val.message.data.ts / 1000000).toFixed(3),
            id: '0x' + (val.message.data.id.toString(16)),
            dlc: getDlcByLen(val.message.data.data.length, val.message.data.msgType.canfd),
            len: val.message.data.data.length,
            device: val.label,
            channel: val.instance,
            msgType: CanMsgType2Str(val.message.data.msgType),
            name: name

         })
      } 
      else if (val.message.method == 'ipBase') {
        
      
        
        insertData({
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
           name: val.message.data.name

        })
     } 
     else if(val.message.method=='linBase'){
        console.log(val)
         if(typeof val.message.data=='string'){
            insertData({
               method: val.message.method,
               dir: '--',
               data: val.message.data,
               ts: (val.message.ts / 1000000).toFixed(3),
               id: '',
               len: 0,
               device: val.label,
               channel: val.instance,
               msgType: 'LIN',
               name: ''
            })
         }else{
            insertData({
               method: val.message.method,
               dir: val.message.data.direction == LinDirection.SEND ? 'Tx' : 'Rx',
               data: data2str(val.message.data.data),
               ts: (val.message.ts / 1000000).toFixed(3),
               id: '0x' + (val.message.data.frameId.toString(16)),
               len: val.message.data.data.length,
               device: val.label,
               channel: val.instance,
               msgType: 'LIN',
               dlc: val.message.data.data.length,
               name: val.message.data.name
            })
         }
     }
      
      else if (val.message.method == 'udsSent') {
         let testerName=val.message.data.service.name
         if(val.message.id){
            testerName=`${database.tester[val.message.id]?.name}.${val.message.data.service.name}`
         }
   
         insertData({
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
            
         })
      } else if (val.message.method == 'udsRecv') {
         let testerName=val.message.data.service.name
         if(val.message.id){
            testerName=`${database.tester[val.message.id]?.name}.${val.message.data.service.name}`
         }
         const data=val.message.data.recvData ? val.message.data.recvData : new Uint8Array(0)
         let method:string = val.message.method
         let msgType= 'UDS Resp' + (val.message.data.msg || '')
         
         if(data[0]==0x7f){
        
            method='udsNegRecv'
            msgType='UDS Negative Resp'+(val.message.data.msg || '')
            

         }
         insertData({
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
          
         })
      } else if (val.message.method == 'canError') {
         //find last udsSent or udsPreSend

         insertData({
            method: val.message.method,
            name: '',
            data: val.message.data.msg,
            ts: (val.message.data.ts / 1000000).toFixed(3),
            id: '',
            len: 0,
            device: val.label,
            channel: val.instance,
            msgType: 'CAN Error',
         })



      } else if(val.message.method=='linError'){
         if(val.message.data.data){
            insertData({
               method: val.message.method,
               name: val.message.data.data.name,
               data: val.message.data.msg,
               ts: (val.message.data.ts / 1000000).toFixed(3),
               id: '0x'+val.message.data.data.frameId?.toString(16),
               len: val.message.data.data.data.length,
               dlc: val.message.data.data.data.length,
               dir: val.message.data.data.direction == LinDirection.SEND ? 'Tx' : 'Rx',
               device: val.label,
               channel: val.instance,
               msgType: 'LIN Error',
               
            })
         }else{
            insertData({
               method: val.message.method,
               name: '',
               data: val.message.data.msg,
               ts: (val.message.data.ts / 1000000).toFixed(3),
               id: '',
               len: 0,
               device: val.label,
               channel: val.instance,
               msgType: 'LIN Error',
               
            })
         }
         
      } 
      
      else if (val.message.method == 'udsScript') {
         insertData({
            method: val.message.method,
            name: '',
            data: val.message.data.msg,
            ts: (val.message.data.ts / 1000000).toFixed(3),
            id: '',
            len: 0,
            device: val.label,
            channel: val.instance,
            msgType: 'Script Message',
         })
      } else if (val.message.method == 'udsSystem') {
         insertData({
            method: val.message.method,
            name: '',
            data: val.message.data.msg,
            ts: (val.message.data.ts / 1000000).toFixed(3),
            id: '',
            len: 0,
            device: val.label,
            channel: val.instance,
            msgType: 'System Message',
         })
      }
   }
   insertData1(logData)

}
function logDisplay(_event: any, val: LogItem) {
   logList.push(val)
}
const props = defineProps<{
   height: number
   // start: boolean
}>()
// const start = toRef(props, 'start')

let timer: any = null


defineExpose({
   clearLog
})

let list: Record<string, () => void>={}
function filterChange(method: 'uds' | 'canBase'|'ipBase'|'linBase', val: boolean) {
   if (method == 'uds') {
      if(list['udsSent']){
         list['udsSent']()
      }
      if(list['udsRecv']){
         list['udsRecv']()
      }
    
   
      if (val) {
         list['udsSent']=window.electron.ipcRenderer.on(`ipc-log-udsSent`, logDisplay)
         list['udsRecv']=window.electron.ipcRenderer.on(`ipc-log-udsRecv`, logDisplay)
       
      }
   } else if (method == 'canBase') {
      if(list['canBase']){
         list['canBase']()
      }
      if(list['canError']){
         list['canError']()
      }
      if (val) {
         window.electron.ipcRenderer.on(`ipc-log-canBase`, logDisplay)
         window.electron.ipcRenderer.on(`ipc-log-canError`, logDisplay)
      }
   } else if (method == 'ipBase') {
      if(list['ipBase']){
         list['ipBase']()
      }
      if(list['ipError']){
         list['ipError']()
      }
      if (val) {
         window.electron.ipcRenderer.on(`ipc-log-ipBase`, logDisplay)
         window.electron.ipcRenderer.on(`ipc-log-ipError`, logDisplay)
      }
   }else if (method == 'linBase') {
      if(list['linBase']){
         list['linBase']()
      }
      if(list['linError']){
         list['linError']()
      }
      if (val) {
         window.electron.ipcRenderer.on(`ipc-log-linBase`, logDisplay)
         window.electron.ipcRenderer.on(`ipc-log-linError`, logDisplay)
      }
   }

}

const tableHeight=toRef(props,'height')

const gridOptions = computed(() => {
   const v: VxeGridProps<LogData> = {
      border: true,
      size: "mini",
      
      columnConfig: {
         resizable: true,
      },
      showOverflow: true,
      scrollY: {
         enabled: true,
         gt: 0
      },
      rowConfig: {
         isCurrent: true,
         height: 30
      },
      toolbarConfig: {
         slots: {
            tools: 'toolbar'
         }
      },
      align: 'center',
      columns: [
         { field: 'type', title: '', width: 36, resizable: false, editRender: {}, slots: { default: 'default_type' } },
         { field: 'ts', title: 'Time', width: 100 },
         { field: 'name', title: 'Name', width: 200 },
         { field: 'data', title: 'Data', minWidth: 300 },
         { field: 'dir', title: 'Dir', width: 50 },
         // { field: 'seqIndex', title: 'Num', width: 50 },

         { field: 'id', title: 'ID', width: 100 },

         { field: 'dlc', title: 'DLC', width: 100 },
         { field: 'len', title: 'Len', width: 100 },
         { field: 'msgType', title: 'Type', width: 100 },
         { field: 'device', title: 'Device', width: 200 },
         { field: 'channel', title: 'Channel', width: 100 },

      ],
      rowClassName: ({ row }) => {
         return row.method
      },
      menuConfig: {

         body: {
            options: [
               [
                  { code: 'copyRaw', name: 'Copy data as raw', visible: true, disabled: false },
                  { code: 'copyArray', name: 'Copy data as array', visible: true, disabled: false },
                  { code: 'copyRow', name: 'Copy row (json)', visible: true, disabled: false },
               ]
            ]
         },

      },
   }

   return v
})


function menuClick(val: any) {
   switch (val.menu.code) {
      case 'copyRaw': {
         const data = val.row.data
         navigator.clipboard.writeText(data)

         break
      }
      case 'copyArray':
         {
            const data1 = val.row.data.split(' ').map((v: any) => `0x${v}`).join(',')
            navigator.clipboard.writeText(data1)

            break
         }
      case 'copyRow':
         {
            const data2 = JSON.stringify(val.row, null, 2)
            navigator.clipboard.writeText(data2)


            break
         }

   }
}

function saveAll() {
   xGrid.value.exportData()
}

onMounted(() => {
   for (const item of checkList.value) {
      if (item == 'canBase') {
         list['canBase']=window.electron.ipcRenderer.on(`ipc-log-canBase`, logDisplay)
         list['canError']=window.electron.ipcRenderer.on(`ipc-log-canError`, logDisplay)
      } else if (item == 'uds') {
         list['udsSent']=window.electron.ipcRenderer.on(`ipc-log-udsSent`, logDisplay)
         list['udsRecv']=window.electron.ipcRenderer.on(`ipc-log-udsRecv`, logDisplay)
      } else if (item == 'ipBase') {
         list['ipBase']=window.electron.ipcRenderer.on(`ipc-log-ipBase`, logDisplay)
         list['ipError']=window.electron.ipcRenderer.on(`ipc-log-ipError`, logDisplay)
      } else if (item == 'linBase') {
         list['linBase']=window.electron.ipcRenderer.on(`ipc-log-linBase`, logDisplay)
         list['linError']=window.electron.ipcRenderer.on(`ipc-log-linError`, logDisplay)
      }
   }
   timer = setInterval(() => {
      if (logList.length > 0) {

         _logDisplay(logList)
         logList = []
      }
   }, 20)

})

onUnmounted(() => {
   for(const f of Object.values(list)){
      f()
   }
   list={}
   clearInterval(timer)
})


</script>

<style>
.canBase {
   color: var(--el-color-primary);
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
</style>