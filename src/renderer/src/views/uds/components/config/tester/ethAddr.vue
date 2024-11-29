<template>
  <el-form :model="data" label-width="150px" size="small" :disabled="globalStart" :rules="rules" ref="ruleFormRef"
    class="hardware" hide-required-asterisk>
    <el-form-item label="Address name" required prop="name">
      <el-input v-model="data.name" />
    </el-form-item>
    <el-form-item label="Address Type" required prop="taType">
      <el-select v-model="data.taType">
        <el-option value="physical" label="Physical"></el-option>
        <el-option value="functional" label="Functional"></el-option>
      </el-select>
    </el-form-item>
    <el-divider content-position="left">
      ECU
    </el-divider>
    <el-form-item label-width="0">

      <el-col :span="12">
        <el-form-item label="logical address" required prop="logicalAddr">
          <el-input v-model="data.logicalAddr" />
        </el-form-item>

      </el-col>
      <el-col :span="12">
        <el-form-item label="EID" required prop="eid">
          <el-input v-model="data.eid" />
        </el-form-item>

      </el-col>
    </el-form-item>
    <el-form-item label-width="0">

      <el-col :span="12">

        <el-form-item label="VIN" required prop="vin">
          <el-input v-model="data.vin" :max="17" />
        </el-form-item>
      </el-col>
      <el-col :span="12">

        <el-form-item label="GID" required prop="gid">
          <el-input v-model="data.gid" :max="17" />
        </el-form-item>
      </el-col>
    </el-form-item>
    <el-divider content-position="left">
      Vehicle Identify Request Behavior
    </el-divider>
    <el-form-item label="VIN Request method" required prop="virReqType">
        <el-select v-model="data.virReqType">
          <el-option value="unicast" label="Unicast VIN Request"></el-option>
          <el-option value="omit" label="Omit VIN, tcp connect directly"></el-option>
          <el-option value="broadcast" label="Broadcast UDP4"></el-option>
          <el-option value="multicast" label="Multicast UDP6" disabled></el-option>
        </el-select>
      </el-form-item>
    <el-form-item label-width="0">
     
      <el-col :span="12">
        <el-form-item label="Request Address" prop="virReqAddr">
          <el-input v-model="data.virReqAddr" />
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="Entity Miss Behavior" prop="entityNotFoundBehavior">
          <el-select v-model="data.entityNotFoundBehavior">
            <el-option value="no" label="Report Error"></el-option>
            <el-option value="normal" label="Send Normal Request"></el-option>
            <el-option value="withVin" label="Send VIN Request"></el-option>
            <el-option value="withEid" label="Send EID Request" disabled></el-option>
          </el-select>
        </el-form-item>

      </el-col>
    </el-form-item>
  </el-form>
</template>

<script lang="ts" setup>
import {
  Ref,
  computed,
  inject,
  onBeforeMount,
  onMounted,
  onUnmounted,
  ref,
  toRef,
  watch,
} from "vue";
import {
  CanAddr,
  calcCanIdMixed,
  calcCanIdNormalFixed,
  CAN_ADDR_FORMAT,
  CAN_ID_TYPE,
  CAN_ADDR_TYPE,
} from "nodeCan/can";
import { v4 } from "uuid";
import { type FormRules, type FormInstance, ElMessageBox } from "element-plus";
import { assign, cloneDeep } from "lodash";
import { UdsAddress } from "nodeCan/uds";
import { EntityAddr } from "nodeCan/doip";

const ruleFormRef = ref<FormInstance>();
const globalStart = toRef(window, 'globalStart')
const data = defineModel<EntityAddr>({
  required: true
});



const nameCheck = (rule: any, value: any, callback: any) => {
  if (value) {
    for (let i = 0; i < addrs.value.length; i++) {
      const hasName = addrs.value[i].canAddr?.name;
      if (hasName == value && i != editIndex.value) {
        callback(new Error("The name already exists"));
      }
    }
    callback();
  } else {
    callback(new Error("Please input node name"));
  }
};

const addrCheck = (rule: any, value: any, callback: any) => {
  if (value) {
    for (let i = 0; i < addrs.value.length; i++) {
      const hasName = addrs.value[i].ethAddr?.logicalAddr;
      if (hasName == value && i != editIndex.value) {
        callback(new Error("The address already exists"));
      }
    }
    callback();
  } else {
    callback(new Error("Please input node name"));
  }
};
const rules: FormRules<EntityAddr> = {
  "name": [
    {
      required: true,
      message: "Please input addr name",
      trigger: "blur",
      validator: nameCheck,
    },
  ],
  "logicalAddr": [
    {
      required: true,
      message: "Please input correct logical name",
      trigger: "blur",
      validator: addrCheck,
    },
  ],
};



const props = defineProps<{
  index: number;
  addrs: UdsAddress[];
}>();

const editIndex = toRef(props, "index");
const addrs = toRef(props, "addrs")

onMounted(() => {
  ruleFormRef.value?.validate().catch(null)
})

async function dataValid() {
  await ruleFormRef.value?.validate()
}
defineExpose({
  dataValid
})


</script>
<style scoped>
.hardware {
  margin: 20px;
}

.vm {
  display: flex;
  align-items: center;
  /* 垂直居中对齐 */
  gap: 4px;
}
</style>