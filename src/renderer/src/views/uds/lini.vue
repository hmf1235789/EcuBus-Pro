<template>
    <div style="display: relative">
        <VxeGrid ref="xGrid" v-bind="gridOptions" class="sequenceTable"  @cell-click="ceilClick">
            
            <template #default_send="{ row }">
                <el-button v-if="row.trigger.type == 'manual'" type="primary" size="small" plain style="width: 70px;"
                    :disabled="!globalStart">
                    <Icon :icon="sendIcon" />
                </el-button>
                
            </template>
           
          
           
            <template #default_channel="{ row }">
                {{ devices[row.channel]?.name }}
            </template>
            <template #edit_channel="{ row }">
                <el-select v-model="row.channel" size="small" style="width: 100%;" clearable>
                    <el-option v-for="item, key in devices" :value="key" :key="key" :label="item.name"></el-option>


                </el-select>
            </template>
          
            <template #default_name="{ row }">
                <el-input v-model="row.name" size="small" style="width: 100%;" />

            </template>
            <template #toolbar>
                <div style="justify-content: flex-start;display: flex;align-items: center;gap:2px;margin-left: 5px;">
                    <el-select v-model="selectedDB" size="small" placeholder="Select Database" clearable style="width: 200px;">
                        <el-option v-for="(db, key) in databases" :key="key" :label="db.name" :value="key"></el-option>
                    </el-select>
                    
                    <el-tooltip effect="light" content="Edit Connect" placement="bottom" :show-after="1000">
                        <el-button type="primary" link @click="editConnect">
                            <Icon :icon="linkIcon" style="rotate: -45deg;font-size: 18px;" />
                        </el-button>
                    </el-tooltip>
                </div>
            </template>

            <template #default_entries="{ row }">
                <VxeTable :data="row.entries" :column-config="{ resizable: true }" size="mini" border>
                    <VxeColumn type="seq" width="50"></VxeColumn>
                    <VxeColumn field="name" title="Name" width="150"></VxeColumn>
                    <VxeColumn field="delay" title="Delay (ms)" width="100"></VxeColumn>
                    <VxeColumn field="isCommand" title="Type" width="100">
                        <template #default="{ row }">
                            {{ row.isCommand ? 'Command' : 'Frame' }}
                        </template>
                    </VxeColumn>
                    <VxeColumn field="details" title="Details" show-overflow>
                        <template #default="{ row }">
                            {{ getEntryDetails(row) }}
                        </template>
                    </VxeColumn>
                </VxeTable>
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
import { ServiceItem, Sequence, getTxPduStr, getTxPdu } from 'nodeCan/uds';
import { useDataStore } from '@r/stores/data';
import { cloneDeep } from 'lodash';
import { onKeyStroke, onKeyUp } from '@vueuse/core';
import { LinBaseInfo } from 'nodeCan/lin';
import { SchTable } from '@r/database/ldfParse'
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
    for (const d of dataBase.ia[editIndex.value].devices) {
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
            dataBase.ia[editIndex.value].database = value
        }
    }
})

const databases = computed(() => dataBase.database.lin || {})

const tableData = computed(() => {
    if (!selectedDB.value || !dataBase.database.lin[selectedDB.value]) {
        return []
    }
    return dataBase.database.lin[selectedDB.value].schTables
})

function getEntryDetails(entry: any) {
    if (entry.isCommand) {
        // Format command details
        if (entry.AssignNAD) return `AssignNAD: ${entry.AssignNAD.nodeName}`
        if (entry.ConditionalChangeNAD) return `ConditionalChangeNAD: NAD=${entry.ConditionalChangeNAD.nad}`
        if (entry.DataDump) return `DataDump: Node=${entry.DataDump.nodeName}`
        if (entry.SaveConfiguration) return `SaveConfiguration: ${entry.SaveConfiguration.nodeName}`
        if (entry.AssignFrameIdRange) return `AssignFrameIdRange: ${entry.AssignFrameIdRange.nodeName}`
        if (entry.AssignFrameId) return `AssignFrameId: ${entry.AssignFrameId.nodeName} - ${entry.AssignFrameId.frameName}`
        return entry.name
    }
    // For frames, return frame name
    return entry.name
}

const gridOptions = computed(() => {
    const v: VxeGridProps<SchTable> = {
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
            {
                type: "seq",
                width: 50,
                title: "",
                align: "center",
                fixed: "left",
                resizable: false,
            },
            { field: 'name', title: 'Schedule Table', width: 150 },
            { field: 'entries', title: 'Entries', minWidth: 300, slots: { default: 'default_entries' } },
        ],
        data: tableData.value,
    }
    return v
})

const fh = computed(() => Math.ceil(h.value * 2 / 3) + 'px')

onMounted(() => {
    null

})


</script>
<style lang="scss">
.canit {
    --el-transfer-panel-body-height: 200px
}

.dataI {
    .el-input-group__prepend {
        padding: 0 5px !important;
    }
}
</style>
<style scoped>
.key-box {
    position: absolute;
    bottom: 20px;
    right: 20px;
    background-color: white;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    border-radius: 0.5rem;
    padding: 2rem;
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.key-text {
    font-size: 2.25rem;
    font-weight: bold;
    color: #1f2937;
}

.hint-text {
    color: #6b7280;
}

/* 动画效果 */
.bounce-enter-active {
    animation: bounce-in 0.2s;
}

.bounce-leave-active {
    animation: bounce-in 0.2s reverse;
}

@keyframes bounce-in {
    0% {
        transform: scale(0.3);
        opacity: 0;
    }

    50% {
        transform: scale(1.1);
    }

    100% {
        transform: scale(1);
        opacity: 1;
    }
}
</style>
