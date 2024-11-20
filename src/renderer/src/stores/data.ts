// stores/counter.js
import { defineStore } from 'pinia'
import { UdsDevice } from 'nodeCan/uds'
import { cloneDeep } from 'lodash'
import { TesterInfo } from 'nodeCan/tester'
import { CanInterAction, CanNode } from 'nodeCan/can'
import { ElMessageBox } from 'element-plus'
import { useProjectStore } from './project'


export interface CanInter{
  type:'can',
  id:string,
  name:string,
  devices:string[],
  action:CanInterAction[]
}

export interface LinInter{
  id:string,
  name:string,
  devices:string[],
  type:'lin',
  action:any[]
}

export type Inter=CanInter|LinInter

export interface State {
  devices: Record<string, UdsDevice>
  tester:Record<string, TesterInfo>
  subFunction: Record<string, { name: string; subFunction: string }[]>
  nodes: Record<string, CanNode>
  ia: Record<string, Inter>
}
export type NodeItem=CanNode


export const useDataStore = defineStore('useDataStore', {
  state: (): State => ({
    devices: {},
    ia: {},
    tester:{},
    subFunction: {},
    nodes: {}
  }),
  actions: {
    globalRun(type: 'start' | 'stop') {

      

      if (type == 'start' && window.globalStart.value == false) {
        window.globalStart.value = true
       
        const project=useProjectStore()
        window.electron.ipcRenderer.invoke('ipc-global-start',cloneDeep(project.projectInfo),cloneDeep(this.devices),cloneDeep(this.tester),cloneDeep(this.nodes)).catch((e: any) => {
          window.globalStart.value = false
        })
      }
      if (type == 'stop' && window.globalStart.value == true) {
        window.electron.ipcRenderer.invoke('ipc-global-stop').finally(() => {
          window.globalStart.value = false
        })
        // globalStart.value = false
      }
    },
    getData(){
      return {
        devices:this.devices,
        ia:this.ia,
        tester:this.tester,
        subFunction:this.subFunction,
        nodes:this.nodes
      }
    }
  }
})
