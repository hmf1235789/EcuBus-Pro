<template>
    <div class="ldf">

        <el-form :model="ldfObj" label-width="200px" size="small" ref="ruleFormRef" :rules="rules">
            <el-form-item label="Database Name" prop="name" required>
                <el-input v-model="ldfObj.name" style="width: 200px;">
                    
                </el-input>
            </el-form-item>
            <el-divider/>
            <el-form-item label="LIN Version" prop="global.LIN_protocol_version">
                <el-select v-model="ldfObj.global.LIN_protocol_version" style="width: 200px;">
                    <el-option v-for="item in ['2.2']" :key="item" :label="item" :value="item" />
                </el-select>
            </el-form-item>
            <el-form-item label="LIN Lang Version" prop="global.LIN_language_version">
                <el-select v-model="ldfObj.global.LIN_language_version" style="width: 200px;">
                    <el-option v-for="item in ['2.2']" :key="item" :label="item" :value="item" />
                </el-select>
            </el-form-item>
            <el-form-item label="LIN Speed(kbps)" prop="global.LIN_speed">
                <el-select v-model="ldfObj.global.LIN_speed" style="width: 200px;">
                    <el-option v-for="item in [19.2, 9.6]" :key="item" :label="item" :value="item" />
                </el-select>
            </el-form-item>
            <el-form-item label-width="0">
                
                <el-col :span="12">
                    <el-form-item label="Timebase(ms)" prop="node.master.timeBase">
                        <el-input v-model="ldfObj.node.master.timeBase" />
                    </el-form-item>
                </el-col>
                <el-col :span="12">
                    <el-form-item label="Jitter(ms)" prop="node.master.jitter">
                        <el-input v-model="ldfObj.node.master.jitter" />
                    </el-form-item>
                </el-col>
            </el-form-item>


        </el-form>

    </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, toRef, ref, h, watch, onMounted, onBeforeMount } from "vue";

import { ElMessageBox, ElNotification, ElSelect, ElOption } from "element-plus";
import {
    ArrowUpBold,
    ArrowDownBold,
    Plus,
    Edit,
    Delete
} from '@element-plus/icons-vue'

import { LDF } from "../ldfParse";


const ldfObj = defineModel<LDF>({
    required: true
})




function resizeHandler() {
    null
}



const formErrors = ref({})
const rules = ref({})
const ruleFormRef = ref()







</script>

<style scoped>
.ldf {
    /* padding: 20px; */
}
</style>