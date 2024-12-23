<template>
    <div >
        <VxeGrid ref="typeGrid" v-bind="typeGridOptions" @cell-click="typeClick">
            <template #toolbar>
                <div class="encode-toolbar">
                    <div class="add-encode-form">
                        <el-form ref="formRef" :model="encodeForm" :rules="formRules" :inline="true" size="small">
                          
                            <el-form-item label="Type" prop="type">
                                <el-select v-model="encodeForm.type" style="width: 160px" @change="handleTypeChange">
                                    <el-option label="Logical Value" value="logicalValue" />
                                    <el-option label="Physical Value" value="physicalValue" />
                                    <el-option label="BCD Value" value="bcdValue" />
                                    <el-option label="ASCII Value" value="asciiValue" />
                                </el-select>
                            </el-form-item>

                            <!-- Logical Value Fields -->
                            <template v-if="encodeForm.type === 'logicalValue'">
                                <el-form-item label="Value" prop="logicalValue.signalValue">
                                    <el-input-number v-model="encodeForm.logicalValue.signalValue"
                                        style="width: 130px" />
                                </el-form-item>
                                <el-form-item label="Description" prop="logicalValue.textInfo">
                                    <el-input v-model="encodeForm.logicalValue.textInfo" style="width: 200px" />
                                </el-form-item>
                            </template>

                            <!-- Physical Value Fields -->
                            <template v-if="encodeForm.type === 'physicalValue'">
                                <el-form-item label="Min" prop="physicalValue.minValue">
                                    <el-input-number v-model="encodeForm.physicalValue.minValue" style="width: 130px" />
                                </el-form-item>
                                <el-form-item label="Max" prop="physicalValue.maxValue">
                                    <el-input-number v-model="encodeForm.physicalValue.maxValue" style="width: 130px" />
                                </el-form-item>
                                <el-form-item label="Scale" prop="physicalValue.scale">
                                    <el-input-number v-model="encodeForm.physicalValue.scale" style="width: 130px" />
                                </el-form-item>
                                <el-form-item label="Offset" prop="physicalValue.offset">
                                    <el-input-number v-model="encodeForm.physicalValue.offset" style="width: 130px" />
                                </el-form-item>
                                <el-form-item label="Description" prop="physicalValue.textInfo">
                                    <el-input v-model="encodeForm.physicalValue.textInfo" style="width: 200px" />
                                </el-form-item>
                            </template>

                            <el-form-item>
                                <el-button type="primary" @click="submitForm" plain>Add Encode</el-button>
                                <el-button type="danger" @click="deleteEncodeType" plain :disabled="selectedTypeIndex < 0">
                                    <Icon :icon="deleteIcon" />
                                </el-button>
                            </el-form-item>
                        </el-form>
                    </div>
                </div>
            </template>

            <template #default_details="{ row }">
                <template v-if="row.type === 'logicalValue'">
                    Value: {{ row.logicalValue?.signalValue }}
                    {{ row.logicalValue?.textInfo ? `, Description: ${row.logicalValue.textInfo}` : '' }}
                </template>
                <template v-else-if="row.type === 'physicalValue'">
                    Range: {{ row.physicalValue?.minValue }} ~ {{ row.physicalValue?.maxValue }},
                    Scale: {{ row.physicalValue?.scale }},
                    Offset: {{ row.physicalValue?.offset }}
                    {{ row.physicalValue?.textInfo ? `, Description: ${row.physicalValue.textInfo}` : '' }}
                </template>
                <template v-else>
                    {{ row.type }}
                </template>
            </template>
        </VxeGrid>
    </div>
</template>

<script lang="ts" setup>
import { ref, computed, inject, Ref } from 'vue'
import { VxeGrid, VxeGridProps } from 'vxe-table'
import { LDF, SignalEncodeType } from '../ldfParse'
import { Icon } from '@iconify/vue'
import deleteIcon from '@iconify/icons-material-symbols/delete'
import { ElMessageBox, type FormInstance, type FormRules } from 'element-plus'

const props = defineProps<{
    editIndex: string
    ldf: LDF
}>()

const modelValue = defineModel<SignalEncodeType>({
    required: true
})

const formRef = ref<FormInstance>()
const selectedTypeIndex = ref(-1)

const encodeForm = ref({
    type: 'logicalValue',
    logicalValue: {
        signalValue: 0,
        textInfo: ''
    },
    physicalValue: {
        minValue: 0,
        maxValue: 100,
        scale: 1,
        offset: 0,
        textInfo: ''
    }
})

const formRules = computed<FormRules>(() => ({
    type: [{ required: true, message: 'Please select type', trigger: 'change' }],
    'logicalValue.signalValue': [{
        required: encodeForm.value.type === 'logicalValue',
        message: 'Please input value',
        trigger: 'blur'
    }],
    'physicalValue.minValue': [{
        required: encodeForm.value.type === 'physicalValue',
        message: 'Please input min value',
        trigger: 'blur'
    }],
    // Add other validation rules as needed
}))

const height = inject('height') as Ref<number>
const typeGridOptions = computed<VxeGridProps>(() => ({
    border: true,
    size: 'mini',
    height: height.value / 3 * 2,
    showOverflow: true,
    columnConfig: { resizable: true },
    rowConfig: { isCurrent: true },
    toolbarConfig: {
        slots: { tools: 'toolbar' }
    },
    columns: [
        { field: 'type', title: 'Type', width: 120 },
        { field: 'details', title: 'Details', minWidth: 300, slots: { default: 'default_details' } }
    ],
    data: modelValue.value.encodingTypes
}))

function typeClick({ rowIndex }) {
    selectedTypeIndex.value = rowIndex
}

function handleTypeChange(type: string) {
    encodeForm.value = {
        type,
        logicalValue: {
            signalValue: 0,
            textInfo: ''
        },
        physicalValue: {
            minValue: 0,
            maxValue: 100,
            scale: 1,
            offset: 0,
            textInfo: ''
        }
    }
}

function submitForm() {
    if (!formRef.value) return

    formRef.value.validate((valid) => {
        if (valid) {
            const type = {
                type: encodeForm.value.type
            } as any

            if (encodeForm.value.type === 'logicalValue') {
                type.logicalValue = { ...encodeForm.value.logicalValue }
            } else if (encodeForm.value.type === 'physicalValue') {
                type.physicalValue = { ...encodeForm.value.physicalValue }
            }

            modelValue.value.encodingTypes.push(type)
            handleTypeChange(encodeForm.value.type)
        }
    })
}

function deleteEncodeType() {
    if (selectedTypeIndex.value < 0) return;
    
    const row = modelValue.value.encodingTypes[selectedTypeIndex.value];
    ElMessageBox.confirm(
        'Are you sure to delete this encoding type?',
        'Warning',
        {
            type: 'warning',
            buttonSize: 'small',
            appendTo: `#win${props.editIndex}`
        }
    ).then(() => {
        modelValue.value.encodingTypes.splice(selectedTypeIndex.value, 1);
        selectedTypeIndex.value = -1;
    })
}
</script>

<style scoped>
.edit-encode {
    padding: 20px;
}

.encode-toolbar {
    padding: 8px;
    display: flex;
}

.add-encode-form {
    flex: 1;
    padding: 20px 0;
}

:deep(.el-form--inline) {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
}

:deep(.el-form--inline .el-form-item) {
    margin: 0;
}

:deep(.el-button-group) {
    display: inline-flex;
}
</style>