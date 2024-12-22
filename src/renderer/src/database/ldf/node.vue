<template>
    <div style="margin-top: 15px;">
        <div>
            <el-form :model="ldfObj" label-width="150px" size="small">
                <el-form-item label="Master Node Name" prop="node.master.nodeName" required>
                    <el-input v-model="ldfObj.node.master.nodeName" style="width: 200px;" />
                </el-form-item>

                <el-form-item label="Slave Nodes" prop="node.slaveNode">
                    <el-table :data="ldfObj.node.salveNode" style="width: 100%" :row-class-name="tableRowClassName">

                        <el-table-column label="Slave Node Name" width="150">
                            <template #default="scope">
                                <el-tag>{{ scope.row }}</el-tag>
                            </template>
                        </el-table-column>
                        <el-table-column align="right">
                            <template #header>
                               
                                <el-button size="small" type="info" plain icon="Plus" @click="addNewSlaveNode">
                                    Add Slave Node
                                </el-button>
                            </template>
                            <template #default="scope">
                               
                               
                                <el-button size="small" plain type="danger" @click="removeSlaveNode(scope.$index)">
                                    Delete
                                </el-button>
                                <el-button size="small" @click="copySlaveNode(scope.row)">
                                    Copy
                                </el-button>
                                <el-button size="small" type="primary" plain @click="editSlaveNode(scope.row)">
                                    Attributes
                                </el-button>
                            </template>
                        </el-table-column>
                    </el-table>
                </el-form-item>
            </el-form>
            <el-dialog v-if="editAttr" v-model="editAttr" :title="`${editNodeName} Attributes`"  width="70%" align-center
                :append-to="`#win${editIndex}`">
                <EditNode v-model="ldfObj.nodeAttrs[editNodeName]" :edit-index="editIndex" :node-name="editNodeName"
                    :ldf="ldfObj">
                </EditNode>
            </el-dialog>
            <!-- <EditNode ref="editNodeRef" :node-name="editNodeName" :ldf-obj="ldfObj" /> -->
        </div>
    </div>
</template>


<script lang="ts" setup>
import { ref, watch, inject, Ref, computed, nextTick, toRaw, onMounted, h, toRef } from 'vue'

import { ElNotification, ElSelect, ElMessageBox, ElOption } from 'element-plus';
import EditNode from './editNode.vue';
import { LDF, NodeAttrDef } from '../ldfParse';
import { cloneDeep } from 'lodash';

const editNodeRef = ref()

const editNodeName = ref('')
const nodeErros = ref({})
const editAttr = ref(false)
const ldfObj = defineModel<LDF>({
    required: true
})
function valid() {
    // nodesAttrValid(ldfObj.value).then((res) => {
    //     nodeErros.value = res
    // }).catch((err) => {
    //     ElNotification.error(err.message)
    // })
}
// watch(ldfObj.value.node.salveNode, () => {
//     valid()
// })

defineExpose({
    valid
})

const tableRowClassName = ({
    row,
    rowIndex,
}: {
    row: string
    rowIndex: number
}) => {
    if (nodeErros.value[row] && Object.keys(nodeErros.value[row]).length > 0) {
        return 'danger-row'
    }
    return ''
}
const props = defineProps<{
    editIndex: string
}>()
function addNewSlaveNode() {
    ElMessageBox.prompt('Please enter the slave node name', 'Add Slave Node',{
        confirmButtonText: 'Add',
        cancelButtonText: 'Cancel',
        inputPattern:/^[a-zA-Z][a-zA-Z0-9_]+$/,
        appendTo: `#win${props.editIndex}`,
        inputErrorMessage: 'Node name can only contain letters, numbers, and underscores, and must start with a letter',
        inputValidator: (value) => {
            if (!value) {
                return 'Node name can\'t be empty'
            }
            if (ldfObj.value.node.salveNode.indexOf(value) != -1) {
                return 'Node name already exist'
            }
            /* slave node name can't equal master node name */
            if (value == ldfObj.value.node.master.nodeName) {
                return 'Slave node name can\'t equal master node name'
            }
            return true
        }
    }).then(({ value }) => {
        ldfObj.value.node.salveNode.push(value)
        /* create default attr */
        ldfObj.value.nodeAttrs[value] = {
            LIN_protocol: '',
            configured_NAD: 1,
            initial_NAD: 1,
            supplier_id: 0,
            function_id: 0,
            variant: 0,
            response_error: '',
            fault_state_signals: [],
            P2_min: 0,
            ST_min: 0,
            N_As_timeout: 0,
            N_Cr_timeout: 0,
            configFrames: []
        }
    }).catch(null)
}
function copySlaveNode(val:string){
    ElMessageBox.prompt('Please enter the slave node name', 'Copy Slave Node',{
        confirmButtonText: 'Copy',
        cancelButtonText: 'Cancel',
        inputPattern:/^[a-zA-Z][a-zA-Z0-9_]+$/,
        appendTo: `#win${props.editIndex}`,
        inputErrorMessage: 'Node name can only contain letters, numbers, and underscores, and must start with a letter',
        inputValidator: (value) => {
            if (!value) {
                return 'Node name can\'t be empty'
            }
            if (ldfObj.value.node.salveNode.indexOf(value) != -1) {
                return 'Node name already exist'
            }
            /* slave node name can't equal master node name */
            if (value == ldfObj.value.node.master.nodeName) {
                return 'Slave node name can\'t equal master node name'
            }
            return true
        }
    }).then(({ value }) => {
        ldfObj.value.node.salveNode.push(value)
        /* create default attr */
        ldfObj.value.nodeAttrs[value] = cloneDeep(ldfObj.value.nodeAttrs[val])
    }).catch(null)
}
function editSlaveNode(nodeName: string) {
    editNodeName.value = nodeName
    nextTick(() => {
        editAttr.value = true
    })
}

function removeSlaveNode(index: number) {
    /* remove node attr*/
    delete ldfObj.value.nodeAttrs[ldfObj.value.node.salveNode[index]]
    ldfObj.value.node.salveNode.splice(index, 1)
}
</script>
<style>
.el-table .danger-row {
    --el-table-tr-bg-color: var(--el-color-danger);
}
</style>