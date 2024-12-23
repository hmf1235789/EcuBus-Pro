<template>
    <div>
        <pre style="margin: 20px;">{{result}}</pre>
    </div>
</template>
<script setup lang="ts">
import { onMounted, ref, watch } from 'vue';
import { LDF } from '../ldfParse';
import temp from './ldf.ldf?raw'
import Handlebars from 'handlebars'
const props=defineProps<{
    ldfObj:LDF
    editIndex:string
}>()


const result=ref('')
watch(()=>props.ldfObj,(newVal)=>{
    try{
        const template=Handlebars.compile(temp)
        result.value=template(newVal)
    }
    catch(e:any){
        result.value=e.message
    }
},{deep:true})
onMounted(()=>{
    try{
        const template=Handlebars.compile(temp)
        result.value=template(props.ldfObj)}
    catch(e:any){
        result.value=e.message
    }
})
</script>