<template>
    <div id="app">
        <el-tabs  type="card" v-model="editableTabsValue">
            <el-tab-pane key="General" label="General">
               <General v-model="ldfObj" />
            </el-tab-pane>
        </el-tabs>
    </div>
</template>

<script setup lang="ts">

import { computed, nextTick, onBeforeUnmount, onMounted, ref, h, watch, toRef } from "vue";
import General from './general.vue'
import { LDF } from "../ldfParse";



const props=defineProps<{
    ldf: LDF
    editIndex: string
}>()


const editableTabsValue = ref('General')


const ldfObj=toRef(props,'ldf')



onMounted(() => {
   


});


</script>

<style>

</style>