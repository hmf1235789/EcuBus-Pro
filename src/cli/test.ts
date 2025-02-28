import { TesterInfo } from "nodeCan/tester"
import { exit } from "process"
import { UdsLOG } from "src/main/log"
import { NodeClass } from "src/main/nodeItem"
import { getJsPath } from "src/main/util"
import { DataSet, NodeItem, TestConfig } from "src/preload/data"
import deviceMain from "./device"
import { DOIP } from "src/main/doip"
import path from "path"
import fsP from "fs/promises"




export default async function main(projectPath:string,projectName:string,data:DataSet,testName:string,reportPath?:string){
    //find tester by name
    const testItem=Object.values(data.tests).find(t=>t.name==testName)
    if(!testItem){
        sysLog.error(`test config ${testName} not found`)
        exit(-1)
    }
 
    const {canBaseMap,linBaseMap,ethBaseMap}=await deviceMain(projectPath,projectName,data.devices)
   
    const nodeItem: NodeItem = {
        id:     testItem.id,
        name:   testItem.name,
        channel: testItem.channel,
        script: testItem.script
      }
      const doips:DOIP[]=[]
      for(const tester of Object.values(data.tester)){
        if(tester.type=='eth'){
         for(const val of ethBaseMap.values()){
            const doip=new DOIP(val,tester)
            doips.push(doip)
         }
        }
      }
      
      const node = new NodeClass(
        nodeItem,
        canBaseMap,
        linBaseMap,
        doips,
        ethBaseMap,
        projectPath,
        projectName,
        data.tester,
        {
          id: testItem.id
        }
      )
     
     
      await node.start()
      await node.getTestInfo()
      node.close()
      if(reportPath){
       
        const html=await node.generateHtml(reportPath,true)
        reportPath=path.join(process.cwd(),reportPath)
        await fsP.writeFile(reportPath,html)
      }

   
    
    
}

