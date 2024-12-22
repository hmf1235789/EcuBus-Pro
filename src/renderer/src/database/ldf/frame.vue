<template>
    <div>
        <VxeGrid ref="xGrid" v-bind="gridOptions" @cell-click="cellClick">
            <template #toolbar>
                <div style="justify-content: flex-start;display: flex;align-items: center;gap:2px;margin-left: 5px;padding: 8px;">
                    <el-button-group>
                        <el-tooltip effect="light" content="Add Frame" placement="bottom" :show-after="1000">
                            <el-button link @click="addFrame">
                                <Icon :icon="fileOpenOutline" style="font-size: 18px;" />
                            </el-button>
                        </el-tooltip>
                        <el-tooltip effect="light" content="Edit Frame" placement="bottom" :show-after="1000">
                            <el-button link type="success" @click="editFrame" :disabled="popoverIndex < 0">
                                <Icon :icon="editIcon" style="font-size: 18px;" />
                            </el-button>
                        </el-tooltip>
                        <el-tooltip effect="light" content="Delete Frame" placement="bottom" :show-after="1000">
                            <el-button link type="danger" @click="removeFrame" :disabled="popoverIndex < 0">
                                <Icon :icon="deleteIcon" style="font-size: 18px;" />
                            </el-button>
                        </el-tooltip>
                    </el-button-group>
                    <!-- <el-checkbox size="small" v-model="autoOffset" label="Enable Auto FrameSize/StartBit Calculate"
                    border /> -->
                </div>
            </template>
            <template #default_name="{ row }">{{ row.name }}</template>
            <template #default_punishedBy="{ row }">{{ row.punishedBy }}</template>
            <template #default_id="{ row }">{{ row.id}}</template>
            <template #default_frameSize="{ row }">{{ row.frameSize }}</template>
            <template #default_maxTime="{ row }">{{ row.maxTime }}</template>
            <template #default_minTime="{ row }">{{ row.minTime }}</template>
        </VxeGrid>
        <el-dialog v-if="editFrameV" v-model="editFrameV" :title="`Edit Frame: ${editFrameName}`" :close-on-click-modal="false"
        width="70%" align-center :append-to="`#win${editIndex}`">
            <EditFrame v-model="ldfObj.frames[editFrameName]" :edit-index="editIndex" :ldf="ldfObj">
            </EditFrame>
        </el-dialog>
    </div>
</template>

<script lang="ts" setup>
import { ref, watch, inject, Ref, computed, nextTick, toRaw, onMounted, h, toRef } from 'vue'
import { LDF, getFrameSize } from '../ldfParse';
import { ElNotification, ElSelect, ElMessageBox, ElOption, ElInput } from 'element-plus';
import {
    ArrowUpBold,
    ArrowDownBold,
    Plus,
    Edit,
    Delete
} from '@element-plus/icons-vue'
import { VxeGrid, VxeGridProps } from 'vxe-table'
import { Icon } from '@iconify/vue'
import fileOpenOutline from '@iconify/icons-material-symbols/file-open-outline'
import editIcon from '@iconify/icons-material-symbols/edit-square-outline'
import deleteIcon from '@iconify/icons-material-symbols/delete'
import EditFrame from './editFrame.vue'

interface frameTable {
    name: string
    id: string,
    punishedBy: string
    frameSize: number
    maxTime: string
    minTime: string
    signalCount: number  // Add this line
    signals: {
        name: string
        startBit: number
        publish: string
        subscribe: string
        length: number
        initValue: string
        unit?: string
        encoding?: string
    }[]
}

const props = defineProps<{
    editIndex: string
}>();

// const autoOffset = ref(false)
const ldfObj = defineModel<LDF>({
    required: true
})

const frameTables = computed(() => {
    const schTables: frameTable[] = []

    for (const frame of Object.values(ldfObj.value.frames)) {
        const buadrate = ldfObj.value.global.LIN_speed
        const bytes = getFrameSize(ldfObj.value, frame.name)

        const frameMinTime = (bytes * 10 + 44) * (1 / buadrate)
        const frameMaxTime = frameMinTime * 1.4
        const tf: frameTable = {
            name: frame.name,
            id: '0x' + frame.id.toString(16),
            punishedBy: frame.publishedBy,
            frameSize: frame.frameSize,
            maxTime: frameMaxTime.toFixed(2),
            minTime: frameMinTime.toFixed(2),
            signalCount: frame.signals.length,  // Add this line
            signals: []
        }

        for (const s of frame.signals) {
            if (s.name in ldfObj.value.signals) {
                const rs = ldfObj.value.signals[s.name]
                let encoding: string | undefined
                let unit
                for (const r of Object.keys(ldfObj.value.signalRep)) {
                    if (ldfObj.value.signalRep[r].indexOf(rs.signalName) != -1 && r in ldfObj.value.signalEncodeTypes && ldfObj.value.signalEncodeTypes[r].encodingTypes.length > 0) {
                        encoding = ldfObj.value.signalEncodeTypes[r].encodingTypes[0].type
                        if (encoding == 'logicalValue') {
                            unit = ldfObj.value.signalEncodeTypes[r].encodingTypes[0].logicalValue?.textInfo
                        } else if (encoding == 'physicalValue') {
                            unit = ldfObj.value.signalEncodeTypes[r].encodingTypes[0].physicalValue?.textInfo
                        }
                    }
                }
                tf.signals.push({
                    name: rs.signalName,
                    startBit: s.offset,
                    publish: rs.punishedBy,
                    subscribe: rs.subscribedBy.join(', '),
                    length: rs.signalSizeBits,
                    initValue: Array.isArray(rs.initValue) ? rs.initValue.join(', ') : rs.initValue.toString(),
                    unit: unit,
                    encoding: encoding
                })
            }
        }
        schTables.push(tf)
    }
    return schTables
})

const expandTable = ref<string[]>([])
function expandChange(a, b) {
    expandTable.value = []
    for (const item of b) {
        expandTable.value.push(item.name)
    }
}

function idUpdate(v: string, frame: frameTable) {
    const targetFrame = ldfObj.value.frames[frame.name]
    if (targetFrame) {
        targetFrame.id = parseInt(v)
    }
}

function frameSizeUpdate(v: number, frame: frameTable) {
    const targetFrame = ldfObj.value.frames[frame.name]
    if (targetFrame) {
        targetFrame.frameSize = v
    }
}

function startBitUpdate(v: number, index: number, frame: frameTable) {
    const targetFrame = ldfObj.value.frames[frame.name]
    if (targetFrame) {
        const targetSignal = targetFrame.signals[index]
        if (targetSignal) {
            targetSignal.offset = v
            autoUpdateOffset(frame.name)
        }
    }
}

function autoUpdateOffset(frameName: string) {
    const targetFrame = ldfObj.value.frames[frameName]
    if (targetFrame) {
        ElMessageBox.confirm('Do you want to update the offset of the following signals?', 'Update offset', {
            confirmButtonText: 'Yes',
            cancelButtonText: 'No',
            type: 'warning',
            buttonSize: 'small'
        }).then(() => {
            for (const [index, s] of targetFrame.signals.entries()) {
                if (s.name in ldfObj.value.signals) {
                    s.offset = index == 0 ? targetFrame.signals[0].offset : targetFrame.signals[index - 1].offset + ldfObj.value.signals[targetFrame.signals[index - 1].name].signalSizeBits
                }
            }
            //frameSize update
            let frameSizeBits = targetFrame.signals.length > 0 ? targetFrame.signals[0].offset : 0
            for (const s of targetFrame.signals) {
                if (s.name in ldfObj.value.signals) {
                    frameSizeBits += ldfObj.value.signals[s.name].signalSizeBits
                }
            }
            targetFrame.frameSize = Math.ceil(frameSizeBits / 8)
        }).catch(() => {
            //do nothing
        });
    }
}

function moveFrame(index: number, frame: frameTable, dir: 'up' | 'down') {
    const targetFrame = ldfObj.value.frames[frame.name]
    if (targetFrame) {
        const targetIndex = targetFrame.signals[index]
        targetFrame.signals.splice(index, 1)
        if (dir == 'up') {
            if (index == 0)
                targetFrame.signals.unshift(targetIndex)
            else
                targetFrame.signals.splice(index - 1, 0, targetIndex)
        } else {
            if (index == targetFrame.signals.length)
                targetFrame.signals.push(targetIndex)
            else
                targetFrame.signals.splice(index + 1, 0, targetIndex)
        }
        autoUpdateOffset(frame.name)
    }
}

const popoverIndex = ref(-1)

function removeFrame() {
    if (popoverIndex.value >= 0) {
        ElMessageBox.confirm('Are you sure to delete this frame?', 'Delete frame', {
            confirmButtonText: 'Yes',
            cancelButtonText: 'No',
            type: 'warning',
            buttonSize: 'small'
        }).then(() => {
            delete ldfObj.value.frames[frameTables.value[popoverIndex.value].name]
            popoverIndex.value = -1
        }).catch(() => {
            //do nothing
        });
    }
}



function addFrame() {
    const name = ref('new Frame')
    const publishedBy = ref(ldfObj.value.node.master.nodeName)
    const nodeList = [ldfObj.value.node.master.nodeName, ...ldfObj.value.node.salveNode]

    ElMessageBox({
        title: `Add New Frame`,
        buttonSize: "small",
        message: () =>
            h('div', [
                h('div', [
                    h('span', 'Frame Name: '),
                    h(ElInput, {
                        size: 'small',
                        modelValue: name.value,
                        'onUpdate:modelValue': (val) => {
                            name.value = val
                        },
                    })
                ]),
                h('div', [
                    h('span', 'Publisher: '),
                    h(ElSelect, {
                        style: { width: '100%' },
                        size: 'small',
                        modelValue: publishedBy.value,
                        'onUpdate:modelValue': (val) => {
                            publishedBy.value = val
                        },
                    }, () => {
                        const slist: any[] = []
                        for (const s of nodeList) {
                            slist.push(
                                h(ElOption, {
                                    value: s,
                                    key: s,
                                    label: s
                                })
                            )
                        }
                        return slist
                    })
                ]),
                h('span', {
                    style: {
                        color: 'gray',
                        fontSize: '12px'
                    }
                }, "Name and Publisher cannot be empty and can't be changed again after creation",)
            ]),
    }).then(() => {
        if (name.value && !(name.value in ldfObj.value.frames)) {
            ldfObj.value.frames[name.value] = {
                name: name.value,
                publishedBy: publishedBy.value,
                id: 0,
                frameSize: 0,
                signals: []
            }
        } else {
            ElNotification({
                title: 'Error',
                message: 'Frame name already exists or empty',
                type: 'error'
            })
        }
    }).catch(() => {
        null
    })
}


const height = inject('height') as Ref<number>

const gridOptions = computed<VxeGridProps<frameTable>>(() => {
    return {
        border: true,
        size: "mini",
        columnConfig: {
            resizable: true,
        },
        height: height.value-40,
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
            { field: 'name', title: 'Frame Name', width: 150, slots: { default: 'default_name' } },
            { field: 'punishedBy', title: 'Frame Publisher', width: 150, slots: { default: 'default_punishedBy' } },
            { field: 'id', title: 'Frame ID', minWidth: 150, slots: { default: 'default_id' } },
            { field: 'frameSize', title: 'Frame Size', minWidth: 150, slots: { default: 'default_frameSize' } },
            { field: 'signalCount', title: 'Signal Count', width: 120 },  // Add this line
            { field: 'maxTime', title: 'Max.Frame Time [ms]', width: 150, slots: { default: 'default_maxTime' } },
            { field: 'minTime', title: 'Min.Frame Time [ms]', width: 150, slots: { default: 'default_minTime' } },
        ],
        data: frameTables.value
    }
})

function cellClick({ rowIndex }) {
    popoverIndex.value = rowIndex
}

const editFrameV = ref(false)
const editFrameName = ref('')

function editFrame() {
    if (popoverIndex.value >= 0) {
        editFrameName.value = frameTables.value[popoverIndex.value].name
        nextTick(() => {
            editFrameV.value = true
        })
    }
}
</script>
<style>
.el-table .danger-row {
    --el-table-tr-bg-color: var(--el-color-danger);
}
</style>