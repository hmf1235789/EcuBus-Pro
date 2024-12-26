<template>
    <div style="display: relative">
        <VxeGrid ref="xGrid" v-bind="gridOptions" class="sequenceTable"  @cell-click="ceilClick">
            
            <template #default_send="{ row }">
                <el-button v-if="row.trigger.type == 'manual'" type="primary" size="small" plain style="width: 70px;"
                    :disabled="!globalStart">
                    <Icon :icon="sendIcon" />
                </el-button>
                
            </template>
           
          
         
        
          
          
            <template #toolbar>
                <div style="justify-content: flex-start;display: flex;align-items: center;gap:4px;margin-left: 5px;padding:6px 4px;">
                    
                    
                    <el-tooltip effect="light" content="Edit Connect" placement="bottom" :show-after="1000">
                        <el-button type="primary" link @click="editConnect">
                            <Icon :icon="linkIcon" style="rotate: -45deg;font-size: 18px;" />
                        </el-button>
                    </el-tooltip>
                    <el-divider direction="vertical"></el-divider>
                    <Icon :icon="databaseIcon"/>
                    <span>Database</span>
                    <el-select v-model="selectedDB" size="small" placeholder="Select Database" clearable style="width: 200px;">
                        <el-option v-for="(db, key) in databases" :key="key" :label="db.name" :value="key"></el-option>
                    </el-select>
                </div>
            </template>

           
          
            <template #expand_content="parent">
                <div class="expand-wrapper">
                    <VxeGrid v-bind="childGridOptions" :data="parent.row.childList">
                        <template #default_active="{ row }">
                            <el-checkbox 
                            size="small"
                                v-model="activeStates[`${parent.row.Table}-${row.index}`]"
                               
                            />
                          
                        </template>
                    </VxeGrid>
                </div>
            </template>
        </VxeGrid>

        
        <el-dialog v-if="connectV" v-model="connectV" title="IA Device Connect" width="590" align-center
            :append-to="`#win${editIndex}_ia`">
            <div
                style="text-align: center;padding-top:10px;padding-bottom: 10px;width:570px;height:250px; overflow: auto;">

                <el-transfer class="canit" style="text-align: left; display: inline-block;"
                    v-model="dataBase.ia[editIndex].devices" :data="allDeviceLabel" :titles="['Valid', 'Assigned ']" />
            </div>
        </el-dialog>
      
     
    </div>
</template>
<script lang="ts" setup>
import { ArrowDown } from '@element-plus/icons-vue'
import { ref, onMounted, onUnmounted, computed, toRef, nextTick, watch } from 'vue'
import { VxeGridProps } from 'vxe-table'
import { VxeGrid, VxeTable, VxeColumn } from 'vxe-table'
import { Icon } from '@iconify/vue'
import circlePlusFilled from '@iconify/icons-material-symbols/scan-delete-outline'
import infoIcon from '@iconify/icons-material-symbols/info-outline'
import errorIcon from '@iconify/icons-material-symbols/chat-error-outline-sharp'
import warnIcon from '@iconify/icons-material-symbols/warning-outline-rounded'
import saveIcon from '@iconify/icons-material-symbols/save'
import fileOpenOutline from '@iconify/icons-material-symbols/file-open-outline';
import linkIcon from '@iconify/icons-material-symbols/add-link';
import sendIcon from '@iconify/icons-material-symbols/send';
import stopIcon from '@iconify/icons-material-symbols/stop';
import deleteIcon from '@iconify/icons-material-symbols/delete';
import editIcon from '@iconify/icons-material-symbols/edit-square-outline';
import databaseIcon from '@iconify/icons-material-symbols/database';
import { ServiceItem, Sequence, getTxPduStr, getTxPdu } from 'nodeCan/uds';
import { useDataStore } from '@r/stores/data';
import { cloneDeep } from 'lodash';
import { onKeyStroke, onKeyUp } from '@vueuse/core';
import { LinBaseInfo } from 'nodeCan/lin';
import { getFrameSize, LDF, SchTable } from '@r/database/ldfParse'
import { LinInter } from 'src/preload/data'

const xGrid = ref()
// const logData = ref<LogData[]>([])

const connectV = ref(false)


const popoverIndex = ref(-1)
const globalStart = toRef(window, 'globalStart')



function ceilClick(val: any) {
    popoverIndex.value = val.rowIndex
}







const devices = computed(() => {
    const dd: Record<string, LinBaseInfo> = {}
    for (const d in dataBase.devices) { 
        if (dataBase.devices[d]&&dataBase.devices[d].type == 'lin' && dataBase.devices[d].linDevice) {
            dd[d] = dataBase.devices[d].linDevice


        }

    }
    return dd
})
interface Option {
    key: string
    label: string
    disabled: boolean
}
const allDeviceLabel = computed(() => {
    const dd: Option[] = []
    for (const d of Object.keys(devices.value)) {
        dd.push({ key: d, label: devices.value[d].name, disabled: false })
    }
    return dd
})

function editConnect() {
    connectV.value = true
}

interface Table{
    Table: string,
    index: number,
    FrameId?: string,
    Active?: boolean,
    Delay?: number,
    Type?: string,
    childList:Table[]
    length?:number
}



// 将 activeStates 改为简单对象
const activeStates = ref<Record<string,boolean>>({})

const props = defineProps<{
    height: number
    editIndex: string

}>()
// const start = toRef(props, 'start')
const h = toRef(props, 'height')

const editIndex = toRef(props, 'editIndex')
const dataBase = useDataStore()

const selectedDB = computed({
    get: () => dataBase.ia[editIndex.value]?.database || '',
    set: (value) => {
        if (dataBase.ia[editIndex.value]) {
            if(dataBase.ia[editIndex.value].database!=value){
                dataBase.ia[editIndex.value].database = value
            }
        }
    }
})

const databases = computed(() => dataBase.database.lin || {})
// 修改 tableData computed
const tableData = computed(() => {
    const tables:Table[] = []
    if (!selectedDB.value || !dataBase.database.lin[selectedDB.value]) {
        return tables
    }
    const db = dataBase.database.lin[selectedDB.value]
    let i = 0;

    for (const table of db.schTables) {
        const t:Table = {
            Table: table.name,
            index: i,
            childList: [],
            length: table.entries.length
        }
        let totalBytes = 0
        for (const [index, entry] of table.entries.entries()) {
            const key=`${table.name}-${index}`
            const frameSize = entry.isCommand ? 8 : getFrameSize(dataBase.database.lin[selectedDB.value], entry.name)
            totalBytes += frameSize
            t.childList.push({
                Table: entry.name,
                index: index,
                FrameId: getFrameId(entry),
    
                Delay: entry.delay,
                Type: getFrameType(entry),
                childList: [],
                length: frameSize
            })
        }
     
        tables.push(t)
        i++
    }
    return tables
})



// 修改 getFrameId 函数处理 sporadic frames
function getFrameId(entry: any): string {
    if (entry.isCommand) {
        return '0x3C'
    }
    
    const db = dataBase.database.lin[selectedDB.value]
    // 检查是否是 sporadic frame
    if (entry.name in db.sporadicFrames) {
        // 获取所有关联帧的ID并组合
        const frameIds = db.sporadicFrames[entry.name].frameNames
            .map(fname => {
                const frame = db.frames[fname]
                return frame ? `0x${frame.id.toString(16).toUpperCase()}` : ''
            })
            .filter(id => id !== '')
        return frameIds.join('|')
    }
    
    // 获取普通帧的ID
    const frame = db.frames[entry.name]
    if (frame) {
        return `0x${frame.id.toString(16).toUpperCase()}`
    }
    // 获取事件触发帧的ID
    const eventFrame = db.eventTriggeredFrames[entry.name]
    if (eventFrame) {
        return `0x${eventFrame.frameId.toString(16).toUpperCase()}`
    }
    return ''
}

function getFrameType(entry: any): string {
    if (entry.isCommand) {
        return 'Command'
    }
    const db = dataBase.database.lin[selectedDB.value]
    if (entry.name in db.frames) {
        return 'Unconditional'
    }
    if (entry.name in db.eventTriggeredFrames) {
        return 'Event Triggered'
    }
    if (entry.name in db.sporadicFrames) {
        return 'Sporadic'
    }
    return 'Unknown'
}

// 修改处理激活状态变化的函数
function handleActiveChange(val: boolean, row: Table) {
    activeStates.value[row.index] = val
}

// 修改 gridOptions computed 添加长度列
const gridOptions = computed(() => {
    const v: VxeGridProps<Table> = {
        expandConfig:{
            expandAll:true,
            padding:false,
        },
        border: true,
        size: "mini",
        columnConfig: {
            resizable: true,
        },
        height: props.height,
        showOverflow: true,
        scrollY: {
            enabled: true,
            gt: 0
        },
        rowConfig: {
            isCurrent: true,
        },
        toolbarConfig: {
            slots: {
                tools: 'toolbar'
            }
        },
        align: 'center',
        columns: [
            
            { type: 'expand', width: 46, slots: { content: 'expand_content' }, resizable:false},
            { field: 'index', title: 'Index', width: 100, resizable:false},
            { field: 'Table', title: 'Schedule Table', minWidth: 150 },
           
            { field: 'length', title: 'Frame Number', minWidth: 120 }
        ],
        data: tableData.value,
    }
    return v
})

// 修改 childGridOptions computed 添加长度列
const childGridOptions = computed(() => {
    const v: VxeGridProps<Table> = {
        border: true,
        size: "mini",
        columnConfig: { resizable: true },
        showOverflow: true,
        align: 'center',
        columns: [
            { field: 'index', title: 'Index', width: 100, resizable:false},
            { field: 'Table', title: 'Frame', minWidth: 150 },
            { field: 'FrameId', title: 'Frame ID', minWidth: 150 },
           
            { 
                field: 'Active', 
                title: 'Active', 
                width: 80,
                slots: { default: 'default_active' }
            },
            { field: 'Delay', title: 'Delay (ms)', width: 100 },
            { field: 'length', title: 'Size (bytes)', width: 100 },
            { field: 'Type', title: 'Type', minWidth: 120 }
        ]
    }
    return v
})

const fh = computed(() => Math.ceil(h.value * 2 / 3) + 'px')

onMounted(() => {
    //set activeStates all true
    for (const table of tableData.value) {
        for (const entry of table.childList) {
            activeStates.value[`${table.Table}-${entry.index}`] = true
        }
    }
})

// 修改 watch,数据库切换时清空激活状态
watch(selectedDB, () => {
    activeStates.value = {}
    nextTick(()=>{
        //set activeStates all true
        for (const table of tableData.value) {
            for (const entry of table.childList) {
                activeStates.value[`${table.Table}-${entry.index}`] = true
            }
        }
    })
})

</script>
<style lang="scss">
.expand-wrapper {
    padding-left: 45px;
    
}
</style>
<style scoped>
</style>
