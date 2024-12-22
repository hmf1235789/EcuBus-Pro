<template>
    <div>
        <VxeGrid ref="xGrid" v-bind="gridOptions" @cell-click="cellClick">
            <template #toolbar>
                <div style="justify-content: flex-start;display: flex;align-items: center;gap:2px;margin-left: 5px;padding: 8px;">
                    <el-button-group>
                        <el-tooltip effect="light" content="Add Schedule Table" placement="bottom" :show-after="1000">
                            <el-button link @click="addSch">
                                <Icon :icon="fileOpenOutline" style="font-size: 18px;" />
                            </el-button>
                        </el-tooltip>
                        <el-tooltip effect="light" content="Edit Schedule" placement="bottom" :show-after="1000">
                            <el-button link type="success" @click="editSchedule" :disabled="selectedIndex < 0">
                                <Icon :icon="editIcon" style="font-size: 18px;" />
                            </el-button>
                        </el-tooltip>
                        <el-tooltip effect="light" content="Delete Schedule" placement="bottom" :show-after="1000">
                            <el-button link type="danger" @click="deleteSch" :disabled="selectedIndex < 0">
                                <Icon :icon="deleteIcon" style="font-size: 18px;" />
                            </el-button>
                        </el-tooltip>
                    </el-button-group>
                </div>
            </template>

            <!-- 添加统计信息插槽 -->
            <template #default_frameCount="{ row }">
                {{ calculateScheduleStats(row).frameDetails || 'No frames' }}
            </template>

            <template #default_totalTime="{ row }">
                {{ calculateScheduleStats(row).totalTime }} ms
            </template>
        </VxeGrid>

        <el-dialog v-if="editDialogVisible"  v-model="editDialogVisible" :close-on-click-modal="false"
                  :title="`Edit Schedule: ${editingSchedule?.name || ''}`"
                  width="70%"
                  align-center :append-to="`#win${editIndex}`">
            <EditSchedule 
                v-if="editDialogVisible && editingSchedule"
                v-model="editingSchedule"
                :edit-index="editIndex"
                :ldf="ldfObj"
            />
        </el-dialog>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, inject, Ref, watch, nextTick } from 'vue'
import { getFrameSize, LDF, SchTable } from '../ldfParse'
import { VxeGrid, VxeGridProps } from 'vxe-table'
import { ElMessageBox, ElNotification } from 'element-plus'
import { Icon } from '@iconify/vue'
import fileOpenOutline from '@iconify/icons-material-symbols/file-open-outline'
import editIcon from '@iconify/icons-material-symbols/edit-square-outline'
import deleteIcon from '@iconify/icons-material-symbols/delete'
import EditSchedule from './editSchedule.vue'

const props = defineProps<{
    editIndex: string
}>()

const ldfObj = defineModel<LDF>({
    required: true
})

const height = inject('height') as Ref<number>
const selectedIndex = ref(-1)
const editDialogVisible = ref(false)
const editingSchedule = ref<any>(null)

const xGrid = ref()

// 添加深度监听调度表变化


const gridOptions = computed<VxeGridProps<SchTable>>(() => ({
    border: true,
    size: 'mini',
    height: height.value - 40,
    showOverflow: true,
    columnConfig: { resizable: true },
    rowConfig: { isCurrent: true },
    toolbarConfig: {
        slots: { tools: 'toolbar' }
    },
    columns: [
        { type: 'seq', width: 50, title: '', fixed: 'left' },
        { field: 'name', title: 'Schedule Table', minWidth: 200 },
        { 
            field: 'frameCount', 
            title: 'Frames', 
            width: 250,
            slots: { default: 'default_frameCount' }
        },
        { 
            field: 'totalTime', 
            title: 'Total Time', 
            width: 150,
            slots: { default: 'default_totalTime' }
        },
    ],
    data: ldfObj.value.schTables
}))

function cellClick({ rowIndex }) {
    selectedIndex.value = rowIndex
}

function addSch() {
    ElMessageBox.prompt('Please input schedule table name', 'Add Schedule Table', {
        confirmButtonText: 'OK',
        cancelButtonText: 'Cancel',
        inputPattern: /\S+/,
        inputErrorMessage: 'Name is required'
    }).then(({ value }) => {
        if (!value) return
        
        if (ldfObj.value.schTables.some(t => t.name === value)) {
            ElNotification({
                title: 'Error',
                message: 'Schedule table name already exists',
                type: 'error'
            })
            return
        }

        if (['MASTERREQ', 'SLAVERESP'].includes(value.toUpperCase())) {
            ElNotification({
                title: 'Error',
                message: `Name ${value} is reserved`,
                type: 'error'
            })
            return
        }

        ldfObj.value.schTables.push({
            name: value,
            entries: []
        })
    })
}

function deleteSch() {
    if (selectedIndex.value < 0) return

    ElMessageBox.confirm(
        'Are you sure to delete this schedule table?',
        'Warning',
        { type: 'warning' }
    ).then(() => {
        ldfObj.value.schTables.splice(selectedIndex.value, 1)
        selectedIndex.value = -1
    })
}

function editSchedule() {
    if (selectedIndex.value < 0) return
    editingSchedule.value = ldfObj.value.schTables[selectedIndex.value]
    editDialogVisible.value = true
}

function calculateScheduleStats(schedule: SchTable) {
    let totalTime = 0
    const frameStats = {
        unconditional: 0,
        eventTriggered: 0,
        sporadic: 0,
        diagnostic: 0,
        command: 0
    }

    schedule.entries.forEach(entry => {
        totalTime += entry.delay

        if (entry.isCommand) {
            frameStats.command++
            return
        }

        // 判断帧类型并计数
        if (entry.name in ldfObj.value.frames) {
            frameStats.unconditional++
        } else if (entry.name in ldfObj.value.eventTriggeredFrames) {
            frameStats.eventTriggered++
        } else if (entry.name in ldfObj.value.sporadicFrames) {
            frameStats.sporadic++
        } else if (['DiagnosticMasterReq', 'DiagnosticSlaveResp'].includes(entry.name)) {
            frameStats.diagnostic++
        }
    })

    const totalFrames = Object.values(frameStats).reduce((sum, count) => sum + count, 0)
    const details:string[] = []
    
    if (frameStats.unconditional > 0) details.push(`${frameStats.unconditional} unconditional`)
    if (frameStats.eventTriggered > 0) details.push(`${frameStats.eventTriggered} event`)
    if (frameStats.sporadic > 0) details.push(`${frameStats.sporadic} sporadic`)
    if (frameStats.diagnostic > 0) details.push(`${frameStats.diagnostic} diagnostic`)
    if (frameStats.command > 0) details.push(`${frameStats.command} command`)

    return {
        frameCount: totalFrames,
        frameDetails: details.join(', '),
        totalTime: totalTime.toFixed(2)
    }
}
</script>