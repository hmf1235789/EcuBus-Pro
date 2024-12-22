<template>
    <div :id="tableId">
        <VxeGrid ref="xGrid" v-bind="gridOptions" @cell-click="cellClick">
            <template #toolbar>
                <div class="schedule-toolbar">
                    <!-- 添加帧表单区域 -->
                    <div class="add-frame-form">
                        <el-form 
                            ref="formRef"
                            :model="addFrameForm"
                            :rules="formRules"
                            :inline="true" 
                            size="small">
                            <el-form-item label="Frame Type" prop="type">
                                <el-select v-model="addFrameForm.type" style="width: 160px" @change="handleFrameTypeChange">
                                    <el-option label="Normal Frame" value="existing" />
                                    <el-option label="Event Triggered" value="EventTrigger" />
                                    <el-option label="Sporadic" value="Sporadic" />
                                    <el-option label="Diagnostic" value="Diagnostic" />
                                    <el-option label="AssignNAD" value="AssignNAD" />
                                    <el-option label="AssignFrameId" value="AssignFrameId" />
                                    <el-option label="ConditionalChangeNAD" value="ConditionalChangeNAD" />
                                    <el-option label="DataDump" value="DataDump" />
                                    <el-option label="SaveConfiguration" value="SaveConfiguration" />
                                    <el-option label="AssignFrameIdRange" value="AssignFrameIdRange" />
                                </el-select>
                            </el-form-item>

                            <!-- Existing Frame Selection -->
                            <template v-if="addFrameForm.type === 'existing'">
                                <el-form-item label="Frame" prop="frameName">
                                    <el-select v-model="addFrameForm.frameName" style="width: 200px">
                                        <el-option v-for="frame in availableFrames" 
                                                 :key="frame" 
                                                 :label="frame" 
                                                 :value="frame" />
                                    </el-select>
                                </el-form-item>
                            </template>

                            <!-- Event Triggered Frame Form -->
                            <template v-if="addFrameForm.type === 'EventTrigger'">
                                <el-form-item label="Name" prop="name">
                                    <el-input v-model="addFrameForm.name" style="width: 150px" />
                                </el-form-item>
                                <el-form-item label="Frame ID" prop="frameId">
                                    <el-input v-model="addFrameForm.frameId" style="width: 100px" />
                                </el-form-item>
                                <el-form-item label="Frames" prop="frameNames">
                                    <el-select v-model="addFrameForm.frameNames" 
                                             multiple 
                                             collapse-tags 
                                             style="width: 200px">
                                        <el-option v-for="frame in availableFrames" 
                                                 :key="frame" 
                                                 :label="frame" 
                                                 :value="frame" />
                                    </el-select>
                                </el-form-item>
                            </template>

                            <!-- Diagnostic Frame Form -->
                            <template v-if="addFrameForm.type === 'Diagnostic'">
                                <el-form-item label="Type" prop="diagnosticType">
                                    <el-select v-model="addFrameForm.diagnosticType" style="width: 120px">
                                        <el-option label="MasterReq" value="MasterReq" />
                                        <el-option label="SlaveResp" value="SlaveResp" />
                                    </el-select>
                                </el-form-item>
                            </template>

                            <!-- Node Selection for commands that need it -->
                            <template v-if="['AssignNAD', 'SaveConfiguration', 'AssignFrameId'].includes(addFrameForm.type)">
                                <el-form-item label="Node" prop="nodeName">
                                    <el-select v-model="addFrameForm.nodeName" style="width: 150px">
                                        <el-option v-for="node in props.ldf.node.salveNode" 
                                                 :key="node" 
                                                 :label="node" 
                                                 :value="node" />
                                    </el-select>
                                </el-form-item>
                            </template>

                            <el-form-item>
                                <el-button type="primary" @click="submitForm" plain>Add Frame</el-button>
                            </el-form-item>
                        </el-form>
                    </div>
                </div>
            </template>

            <!-- 新增操作列模板 -->
            <template #default_operate="{ row }">
                <el-button-group>
                    <el-button 
                        link 
                        type="danger" 
                        @click="deleteFrame(row)"
                        title="Delete Frame">
                        <Icon :icon="deleteIcon" />
                    </el-button>
                </el-button-group>
            </template>

            <template #default_drag>
                <el-icon :id="'schDragBtn' + editIndex" class="drag-btn" @mouseenter="rowDrop">
                    <Grid />
                </el-icon>
            </template>

            <template #default_name="{ row }">
                {{ getFrameDisplayName(row) }}
            </template>

            <template #default_id="{ row }">
                <el-tag v-if="getFrameId(row)" size="small">0x{{ getFrameId(row) }}</el-tag>
            </template>

            <template #default_type="{ row }">
                <el-tag>{{ getFrameType(row) }}</el-tag>
            </template>

            <template #edit_delay="{ row }">
                <el-input-number v-model="row.delay" :min="0" :step="1" size="small" controls-position="right"
                    @change="updateDelay(row)" />
            </template>

            <template #default_minTime="{ row }">
                {{ calculateFrameTime(row).minTime }}
            </template>

            <template #default_maxTime="{ row }">
                {{ calculateFrameTime(row).maxTime }}
            </template>
        </VxeGrid>

      
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, nextTick, h, inject, Ref, toRef } from 'vue'
import { VxeGrid, VxeGridProps } from 'vxe-table'
import { Icon } from '@iconify/vue'
import { ElMessageBox, ElNotification, ElOption, ElSelect } from 'element-plus'
import { Grid, ArrowDown } from '@element-plus/icons-vue'
import fileOpenOutline from '@iconify/icons-material-symbols/file-open-outline'
import addIcon from '@iconify/icons-material-symbols/add'
import deleteIcon from '@iconify/icons-material-symbols/delete'
import Sortable from 'sortablejs'
import { LDF, SchTable, getFrameSize } from '../ldfParse'
import type { FormInstance, FormRules } from 'element-plus'

const props = defineProps<{
    editIndex: string
    ldf: LDF
}>()

const schedule = defineModel<SchTable>({
    required: true
})
const ldf=toRef(props,'ldf')
const selectedIndex = ref(-1)

type Entry = typeof schedule.value.entries[0]

const tableId = computed(() => {
    return `scheduleTable${props.editIndex}`
})
const height=inject('height') as Ref<number>
const gridOptions = computed<VxeGridProps<Entry>>(() => ({
    border: true,
    size: 'mini',
    height: height.value/3*2,
    showOverflow: true,
    columnConfig: { resizable: true },
    rowConfig: { isCurrent: true },
    toolbarConfig: { slots: { tools: 'toolbar' } },
    editConfig: {
        trigger: 'click',
        mode: 'cell',
        showIcon: false
    },
    id: tableId.value,
    columns: [
        {
            field: 'drag',
            title: '',
            width: 36,
            fixed: "left",
            resizable: false,
            slots: { default: 'default_drag' }
        },
        
        {
            field: 'name',
            title: 'Frame',
            minWidth: 200,
            slots: { default: 'default_name' }
        },
        {
            field: 'id',
            title: 'ID',
            width: 80,
            slots: { default: 'default_id' }
        },
        {
            field: 'type',
            title: 'Type',
            width: 150,
            slots: { default: 'default_type' }
        },
        {
            field: 'delay',
            title: 'Delay [ms]',
            width: 150,
            editRender: {},
            slots: { edit: 'edit_delay' }
        },
        {
            field: 'minTime',
            title: 'Min Time [ms]',
            width: 120,
            slots: { default: 'default_minTime' }
        },
        {
            field: 'maxTime',
            title: 'Max Time [ms]',
            width: 120,
            slots: { default: 'default_maxTime' }
        },
        {
            field: 'operate',
            title: 'Operation',
            align:'center',
            width: 80,
            fixed: "right",
            slots: { default: 'default_operate' }
        },
    ],
    data: schedule.value.entries
}))

// 帧显示名称计算
function getFrameDisplayName(entry: Entry) {
    if (entry.isCommand) {
        if (entry.name === 'DiagnosticMasterReq') return 'MasterReq'
        if (entry.name === 'DiagnosticSlaveResp') return 'SlaveResp'
        return entry.name
    }
    return entry.name
}

// 帧ID计算
function getFrameId(entry: Entry) {
    if (entry.isCommand) {
        if (entry.name === 'DiagnosticMasterReq') return '3C'
        if (entry.name === 'DiagnosticSlaveResp') return '3D'
        return undefined
    }
    
    const frame = props.ldf.frames[entry.name]
    if (frame) {
        return frame.id.toString(16)
    }
    
    const eventFrame = props.ldf.eventTriggeredFrames[entry.name]
    if (eventFrame) {
        return eventFrame.frameId.toString(16)
    }
    
    return undefined
}

// 帧类型计算
function getFrameType(entry: Entry) {
    if (entry.isCommand) {
        return entry.name
    }
    
    if (entry.name in props.ldf.frames) {
        return 'Unconditional'
    }
    if (entry.name in props.ldf.eventTriggeredFrames) {
        return 'Event Triggered'
    }
    if (entry.name in props.ldf.sporadicFrames) {
        return 'Sporadic'
    }
    return ''
}

// 帧时间计算
function calculateFrameTime(entry: Entry) {
    const frameSize = entry.isCommand ? 8 : getFrameSize(props.ldf, entry.name)
    const baudRate = props.ldf.global.LIN_speed
    const baseTime = (frameSize * 10 + 44) * (1 / baudRate)
    
    return {
        minTime: baseTime.toFixed(2),
        maxTime: (baseTime * 1.4).toFixed(2)
    }
}

function cellClick({ rowIndex }) {
    selectedIndex.value = rowIndex
}

const selectedFrame = ref('')

// 新增表单状态
const addFrameForm = ref({
    type: 'existing',
    frameName: '',
    name: '',
    frameId: '',
    frameNames: [],
    diagnosticType: 'MasterReq',
    nodeName: '',
    // 其他字段根据需要添加
})

const formRef = ref<FormInstance>()

// 表单验证规则
const formRules = computed<FormRules>(() => ({
    type: [{ required: true, message: 'Please select frame type', trigger: 'change' }],
    frameName: [{
        required: addFrameForm.value.type === 'existing',
        message: 'Please select a frame',
        trigger: 'change'
    }],
    name: [{
        required: addFrameForm.value.type === 'EventTrigger',
        message: 'Please input event frame name',
        trigger: 'blur'
    }],
    frameId: [
        {
            required: addFrameForm.value.type === 'EventTrigger',
            message: 'Please input frame ID',
            trigger: 'blur'
        },
        {
            pattern: /^[0-9a-fA-F]+$/,
            message: 'Frame ID must be hexadecimal',
            trigger: 'blur'
        }
    ],
    frameNames: [{
        type: 'array',
        required: addFrameForm.value.type === 'EventTrigger',
        message: 'Please select at least one frame',
        trigger: 'change'
    }],
    diagnosticType: [{
        required: addFrameForm.value.type === 'Diagnostic',
        message: 'Please select diagnostic type',
        trigger: 'change'
    }],
    nodeName: [{
        required: ['AssignNAD', 'SaveConfiguration', 'AssignFrameId'].includes(addFrameForm.value.type),
        message: 'Please select a node',
        trigger: 'change'
    }]
}))

// 计算可用的帧
const availableFrames = computed(() => Object.keys(props.ldf.frames))

// 处理帧类型变化
function handleFrameTypeChange(type: string) {
    addFrameForm.value = {
        type,
        frameName: '',
        name: '',
        frameId: '',
        frameNames: [],
        diagnosticType: 'MasterReq',
        nodeName: '',
    }
    // 重置表单验证
    nextTick(() => {
        formRef.value?.clearValidate()
    })
}

// 处理添加帧
function submitForm() {
    console.log('submitForm')
    if (!formRef.value) return
   
  
        formRef.value.validate((valid) => {
            console.log('valid', valid)
            if (valid) {
                handleAddFrame()
            } 
        })
       
}

function handleAddFrame() {
    const form = addFrameForm.value
    
    switch(form.type) {
        case 'existing':
            if (form.frameName) {
                schedule.value.entries.push({
                    name: form.frameName,
                    delay: 0,
                    isCommand: false
                })
            }
            break;
            
        case 'EventTrigger':
            if (form.name && form.frameId && form.frameNames.length > 0) {
                // 添加事件触发帧的逻辑
                ldf.value.eventTriggeredFrames[form.name] = {
                    frameId: parseInt(form.frameId),
                    name: form.name,
                    frameNames: form.frameNames,
                    schTableName: props.editIndex
                }
                schedule.value.entries.push({
                    name: form.name,
                    delay: 0,
                    isCommand: false
                })
            }
            break;
            
        case 'Diagnostic':
            schedule.value.entries.push({
                name: form.diagnosticType === 'MasterReq' ? 'DiagnosticMasterReq' : 'DiagnosticSlaveResp',
                delay: 0,
                isCommand: true
            })
            break;
            
        // 添加其他类型的处理逻辑...
    }
    
    // 重置表单
    handleFrameTypeChange(form.type)
}

function updateDelay(row: any) {
    const entry = schedule.value.entries[selectedIndex.value]
    if (entry) {
        entry.delay = row.delay
    }
}

// 修改删除方法，直接接收行数据
function deleteFrame(row: Entry) {
    ElMessageBox.confirm(
        'Are you sure to delete this frame?',
        'Warning',
        {
            confirmButtonText: 'OK',
            cancelButtonText: 'Cancel',
            buttonSize: 'small',
            type: 'warning',
            appendTo: `#win${props.editIndex}`
        }
    ).then(() => {
        const index = schedule.value.entries.findIndex(entry => entry === row)
        if (index !== -1) {
            schedule.value.entries.splice(index, 1)
            selectedIndex.value = -1
        }
    })
}

const rowDrop = () => {
    nextTick(() => {
        const wrapper = document.querySelector(
            `#${tableId.value} tbody`
        ) as HTMLElement

        if (wrapper) {
            Sortable.create(wrapper, {
                animation: 300,
                handle: `#schDragBtn${props.editIndex}`,
                onEnd: ({ newIndex, oldIndex }) => {
                    if (newIndex === oldIndex) return
                    if (newIndex === undefined || oldIndex === undefined) return

                    const currentRow = schedule.value.entries.splice(oldIndex, 1)[0]
                    schedule.value.entries.splice(newIndex, 0, currentRow)
                }
            })
        }
    })
}
</script>

<style scoped>
.drag-btn {
    cursor: move;
}

.schedule-toolbar {
    padding: 8px;
    display: flex;
}

.add-frame-form {
    flex: 1;
    padding:20px 0;
}

/* 移除表单项的垂直对齐，允许自然流式布局 */
:deep(.el-form--inline) {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

:deep(.el-form--inline .el-form-item) {
    margin: 0;
}

/* 确保按钮组样式正常 */
:deep(.el-button-group) {
    display: inline-flex;
}
</style>
