<template>
    <div>
        <VxeGrid ref="xGrid" v-bind="gridOptions" class="sequenceTable" @menu-click="menuClick" :height="tableHeight" >
            <template #default_type="{ row }">
                <Icon :icon="errorIcon" v-if="row.level == 'error'" style="font-size: 14px;margin-top:8px" />
                <Icon :icon="infoIcon" v-else-if="row.level == 'info'" style="font-size: 14px;margin-top:8px" />
                <Icon :icon="warnIcon" v-else-if="row.level == 'warn'" style="font-size: 14px;margin-top:8px" />
            </template>
            <template #toolbar>
                <div style="justify-content: flex-start;display: flex;align-items: center;gap:2px;margin-left: 5px">
                    <el-button-group>
                        <el-tooltip effect="light" content="Clear Message" placement="bottom" :show-after="1000">
                            <el-button type="danger" link @click="clearLog">
                                <Icon :icon="circlePlusFilled" />
                            </el-button>
                        </el-tooltip>
                    </el-button-group>

                    <el-divider direction="vertical" />
                    <el-dropdown size="small">
                        <el-button type="info" link @click="saveLog">
                            <Icon :icon="saveIcon" />
                        </el-button>

                        <template #dropdown>
                            <el-dropdown-menu>
                                <el-dropdown-item>Save Message</el-dropdown-item>
                            </el-dropdown-menu>
                        </template>
                    </el-dropdown>
                </div>
            </template>
        </VxeGrid>
    </div>
</template>
<script lang="ts" setup>
import { ref, onMounted, onUnmounted, computed, toRef, watch } from 'vue'
import { CAN_ID_TYPE, CanMsgType, getDlcByLen } from 'nodeCan/can';
import { VxeGridProps } from 'vxe-table'
import { VxeGrid } from 'vxe-table'
import { Icon } from '@iconify/vue'
import circlePlusFilled from '@iconify/icons-material-symbols/scan-delete-outline'
import infoIcon from '@iconify/icons-material-symbols/info-outline'
import errorIcon from '@iconify/icons-material-symbols/chat-error-outline-sharp'
import warnIcon from '@iconify/icons-material-symbols/warning-outline-rounded'
import saveIcon from '@iconify/icons-material-symbols/save'
interface LogData {
    time: string,
    label: string,
    level: string,
    message: string

}

const xGrid = ref()
// const logData = ref<LogData[]>([])



function clearLog() {
    // logData.value = []
    xGrid.value?.remove()

}


const props = defineProps<{
    height: number

}>()
// const start = toRef(props, 'start')


defineExpose({
    clearLog
})


watch(window.globalStart,(val)=>{
    if(val){
        clearLog()
    }
})
const tableHeight=toRef(props,'height')

const gridOptions = computed(() => {
    const v: VxeGridProps<LogData> = {
        border: false,
        size: "mini",
        columnConfig: {
            resizable: true,
        },
        showOverflow: true,
        scrollY: {
            enabled: true,
            gt: 0,
            mode:'wheel'
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
            { field: 'level', title: '', width: 36, resizable: false, editRender: {}, slots: { default: 'default_type' } },
            { field: 'time', title: 'Time', width: 150, },
            { field: 'label', title: 'Source', width: 200, },
            { field: 'message', title: 'Message', align:'left'},

        ],
        rowClassName: ({ row }) => {
            return row.level
        },
        menuConfig: {
            body: {
                options: [
                    [
                        {
                            code: 'copyRaw', name: 'Copy', visible: true, disabled: false, prefixConfig: {
                                icon: 'vxe-icon-copy',
                            }
                        },

                    ]
                ]
            },
        }
    }

    return v
})


function menuClick(val: any) {
    switch (val.menu.code) {
        case 'copyRaw':
            {
                const data = `${val.row.label} ${val.row.message}`
                navigator.clipboard.writeText(data)
                break
            }

    }
}

function saveLog() {
    xGrid.value.exportData()
}

function udsLog(event,data){

    logData.push({
        time:  new Date().toLocaleTimeString(),
        label: data.label,
        level: data.level,
        message: data.message.data.msg
    })
}

let logData: LogData[] = []
let timer: any = null
let list: Array<() => void> = []
onMounted(() => {
    window.electron.ipcRenderer.on('ipc-log-main', (event, data) => {
       
        data.time = new Date().toLocaleTimeString()
        logData.push(data)
    })
    list.push(window.electron.ipcRenderer.on('ipc-log-udsSystem', udsLog))
    list.push(window.electron.ipcRenderer.on('ipc-log-udsScript', udsLog))
    list.push(window.electron.ipcRenderer.on('ipc-log-udsWarning', udsLog))
   
    
    timer = setInterval(() => {
        if (logData.length > 0) {
            xGrid.value.insertAt(logData, -1).then((v: any) => {
                xGrid.value.scrollToRow(v.row)

            }).finally(() => {
                logData = []
            })


        }
    }, 50)
    
})

onUnmounted(() => {
    
    //pop list and exec
    list.forEach((v) => {
        v()
    })
    list=[]
    clearInterval(timer)
})



</script>

<style>
.info {
    color: var(--el-color-info-dark-5);
}
.debug{
    color: var(--el-color-info);
}

.success {
    color: var(--el-color-success);
}

.error {
    color: var(--el-color-danger);
}

.warn {
    color: var(--el-color-warning);
}
</style>