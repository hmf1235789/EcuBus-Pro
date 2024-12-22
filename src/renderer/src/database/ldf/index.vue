<template>
    <div id="app">
        <el-tabs class="ldfTabs" type="card" v-model="editableTabsValue" >
            <el-tab-pane name="General" label="General">
                <General v-model="ldfObj" ref="generateRef" :edit-index="props.editIndex"  />
                
                <!-- Add error section -->
                <div class="error-section">
                    <el-divider content-position="left">
                        <el-button type="success" size="small" plain v-if="errorList.length==0" @click="saveDataBase">
                            Save Database
                        </el-button>
                        <el-button v-else size="small" type="danger" plain disabled>
                            Fix errors to save the database
                        </el-button>
                    </el-divider>
                    
                    <VxeGrid v-if="errorList.length>0" ref="errorGrid" v-bind="errorGridOptions" @cell-click="navigateToError">
                        <template #type="{ row }">
                            <span class="error-type">{{ row.type }}</span>
                        </template>
                    </VxeGrid>
                </div>
            </el-tab-pane>
            <el-tab-pane name="Nodes" label="Nodes">
                <Node v-model="ldfObj" ref="nodeRef" :edit-index="props.editIndex"/>
            </el-tab-pane>
            <el-tab-pane name="Signals" label="Signals">
                <Signal v-model="ldfObj" ref="SignalRef" :edit-index="props.editIndex"/>
            </el-tab-pane>
            <el-tab-pane name="Frames" label="Frames">
                <Frame v-model="ldfObj" ref="FrameRef" :edit-index="props.editIndex"/>
            </el-tab-pane>
            <el-tab-pane name="Sch" label="Schedule Tables">
                <Sch v-model="ldfObj" ref="FrameRef" :edit-index="props.editIndex"/>
            </el-tab-pane>
            <el-tab-pane name="Encodings" label="Encodings">
                <Encode v-model="ldfObj" ref="FrameRef" :ldf-obj="ldf" :edit-index="props.editIndex"/>
            </el-tab-pane>
        </el-tabs>
    </div>
</template>

<script setup lang="ts">

import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, toRef, inject, provide } from "vue";
import General from './general.vue'
import Node from "./node.vue";
import Signal from "./signal.vue";
import { LDF } from "../ldfParse";
import saveIcon from '@iconify/icons-material-symbols/save'
import { Icon } from '@iconify/vue'
import { Layout } from "@r/views/uds/layout";
import { useDataStore } from "@r/stores/data";
import { ElMessage, ElNotification } from "element-plus";
import { assign, cloneDeep } from "lodash";
import Frame from "./frame.vue";
import Sch from "./sch.vue";
import Encode from "./encode.vue";
import { VxeGrid, VxeGridProps } from 'vxe-table'

const layout = inject('layout') as Layout

const props = defineProps<{
    ldf: LDF
    editIndex: string
    height: number
}>()

const generateRef = ref()
const nodeRef=ref()
const h = toRef(props, 'height')
const editableTabsValue = ref('General')
provide('height', h)
const database = useDataStore()

const ldfObj = ref(props.ldf)

interface ErrorItem {
    tab: string
    type: string
    message: string
    location: string
    field?: string
}

const errorList = computed<ErrorItem[]>(() => {
    const errors: ErrorItem[] = []
    
    // {
    //     errors.push({
    //         tab: 'General',
    //         type: 'Missing',
    //         message: 'LIN protocol version is required',
    //         location: 'General Settings',
    //         field: 'global.LIN_protocol_version'
    //     })
    // }
    
    // validateNodes(errors)
    // validateSignals(errors)
    // validateFrames(errors)
    // validateSchedules(errors)
    // validateEncodings(errors)
    
    return errors
})

// function validateNodes(errors: ErrorItem[]) {
//     if (!ldfObj.value.node.master.timeBase || ldfObj.value.node.master.timeBase <= 0) {
//         errors.push({
//             tab: 'Nodes',
//             type: 'Invalid',
//             message: 'Master timebase must be greater than 0',
//             location: 'Master Node',
//             field: 'node.master.timeBase'
//         })
//     }
// }

// function validateSignals(errors: ErrorItem[]) {
//     Object.entries(ldfObj.value.signals).forEach(([signalName, signal]) => {
//         if (!signal.size || signal.size <= 0) {
//             errors.push({
//                 tab: 'Signals',
//                 type: 'Invalid',
//                 message: `Signal size must be greater than 0`,
//                 location: `Signal: ${signalName}`,
//                 field: `signals.${signalName}.size`
//             })
//         }
//     })
// }

const errorGridOptions = computed<VxeGridProps>(() => ({
    border: true,
    size: 'mini',
    height: 'auto',
    maxHeight: 300,
    showOverflow: true,
    columnConfig: { resizable: true },
    rowConfig: {
        isCurrent: true,
        className: 'error-row'
    },
    columns: [
        {
            field: 'tab',
            title: 'Tab',
            width: 120,
            className: 'error-cell'
        },
        {
            field: 'type',
            title: 'Type',
            width: 120,
            slots: { default: 'type' }
        },
        {
            field: 'message',
            title: 'Error Message',
            minWidth: 200
        },
        {
            field: 'location',
            title: 'Location',
            width: 200
        }
    ],
    data: errorList.value
}))

function navigateToError({ row }: { row: ErrorItem }) {
    editableTabsValue.value = row.tab
    
    if (row.field) {
        nextTick(() => {
            const fieldElements = document.querySelectorAll(`[data-field="${row.field}"]`)
            fieldElements.forEach(el => {
                el.classList.add('error-highlight')
                setTimeout(() => {
                    el.classList.remove('error-highlight')
                }, 2000)
            })
        })
    }
}

async function valid() {
    const list: Promise<boolean>[] = []
    list.push(generateRef.value.validate())
    await Promise.all(list)
    return errorList.value.length === 0
}

function saveDataBase() {
    valid().then(() => {
        database.$patch(() => {
            database.database.lin[props.editIndex] = cloneDeep(ldfObj.value)
        })
        layout.changeWinName(props.editIndex, ldfObj.value.name)
        

        ElNotification({
            offset: 50,
            type: 'success',
            message: "The database has been saved successfully",
            appendTo:`#win${props.editIndex}`
        })
    }).catch(null)
}
function handleTabSwitch(tabName: string) {
    editableTabsValue.value = tabName
}
watch(ldfObj, (val) => {
    valid().catch(null)
}, { deep: true })

onMounted(() => {
    // Add your onMounted logic here
});


</script>

<style lang="scss">
.ldfTabs {
    .el-tabs__header {
        
            margin-bottom: 0px !important;
        }
    
}

.error-section {
    padding: 0 20px;
}

.error-type {
    color: var(--el-color-danger);
    font-weight: bold;
}

:deep(.error-cell) {
    cursor: pointer;
}

:deep(.error-row:hover) {
    background-color: var(--el-color-danger-light-9);
}

:deep(.error-highlight) {
    animation: highlightError 2s ease-in-out;
}

@keyframes highlightError {
    0%, 100% {
        background-color: transparent;
    }
    50% {
        background-color: var(--el-color-danger-light-8);
    }
}
</style>