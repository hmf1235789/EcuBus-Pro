import { UdsDevice } from "../share/uds";
import { PeakLin } from "./peak";
import dllLib from '../../../resources/lib/zlgcan.dll?asset&asarUnpack'
import path from "path";
import { getFrameData, getPID, LinBaseInfo, LinChecksumType, LinDevice, LinDirection, LinMode, LinMsg, LinNode } from "../share/lin";
import { Frame, LDF } from "src/renderer/src/database/ldfParse";
import EventEmitter from "events";
import { cloneDeep, isEqual } from "lodash";
import LinBase from "./base";
import { TesterInfo } from "../share/tester";
import { UdsLOG } from "../log";
import UdsTester from "../workerClient";
import fs from 'fs'


const libPath = path.dirname(dllLib)
PeakLin.loadDllPath(libPath)




export function openLinDevice(device: LinBaseInfo) {
    let canBase: LinBase | undefined



    // #v-ifdef IGNORE_NODE!='1'
    if (device.vendor == 'peak') {
        canBase = new PeakLin(device)
    }

    return canBase
}


export function getLinVersion(vendor: string) {
    // #v-ifdef IGNORE_NODE!='1'
    vendor = vendor.toUpperCase()
    if (vendor === 'PEAK') {
        return PeakLin.getLibVersion()
    }
    else
    // #v-endif
    {
        return 'unknown'
    }

}

export function getLinDevices(vendor: string) {
    vendor = vendor.toUpperCase()
    // #v-ifdef IGNORE_NODE!='1'
    if (vendor === 'PEAK') {
        return PeakLin.getValidDevices()
    }
    else
    // #v-endif
    {
        return []
    }
}


export class NodeLinItem {
    private pool?: UdsTester
    tester?: TesterInfo
    log?: UdsLOG
    db?: LDF
    constructor(
        public nodeItem: LinNode,
        private linBaseMap: Map<string, LinBase>,
        private projectPath: string,
        private projectName: string,
        testers: Record<string, TesterInfo>
    ) {

        const device = linBaseMap.get(nodeItem.channel[0])
        if (device) {
            if (nodeItem.workNode) {
                this.db=device.setupEntry(nodeItem.workNode)
                if(this.db){
                    device.registerNode(this.db,nodeItem.workNode)
                }
            }
        }

        if (nodeItem.script) {
            const outDir = path.join(this.projectPath, '.ScriptBuild')
            const scriptNameNoExt = path.basename(nodeItem.script, '.ts')
            const jsPath = path.join(outDir, scriptNameNoExt + '.js')
            if (fs.existsSync(jsPath)) {
                this.tester = cloneDeep(nodeItem.attachTester ? testers[nodeItem.attachTester] : undefined)
                this.log = new UdsLOG(`${nodeItem.name} ${path.basename(nodeItem.script)}`, this.tester?.id)
                this.pool = new UdsTester({
                    PROJECT_ROOT: this.projectPath,
                    PROJECT_NAME: this.projectName,
                    MODE: 'node',
                    NAME: nodeItem.name,
                }, jsPath, this.log, this.tester)
                this.pool.registerHandler('sendLinFrame', this.sendFrame.bind(this))
                //find tester
                for (const c of nodeItem.channel) {
                    const baseItem = this.linBaseMap.get(c)
                    if (baseItem) {
                        baseItem.attachLinMessage(this.cb.bind(this))
                    }
                }
            }
        }
        //     const db = global.database.lin[nodeItem.database]
        //     if (db) {

        //         this.db = db
        //         // db.event.on('signal', this.cb)
        //     }
        // }
    }
    close() {
        for (const c of this.nodeItem.channel) {
            const baseItem = this.linBaseMap.get(c)
            if (baseItem) {
                baseItem.detachLinMessage(this.cb.bind(this))
            }
        }
        this.pool?.stop()


    }
    async start() {


        this.pool?.updateTs(0)
        await this.pool?.start(this.projectPath)

    }
    cb(frame: LinMsg) {
        if (frame.uuid != this.nodeItem.id) {
            this.pool?.triggerLinFrame(frame)
        }

    }
    async sendFrame(pool: UdsTester, frame: LinMsg): Promise<number> {
        frame.uuid = this.nodeItem.id
        frame.data=Buffer.from(frame.data)
       
        if (this.nodeItem.channel.length == 1) {
          const baseItem = this.linBaseMap.get(this.nodeItem.channel[0])
          if (baseItem) {
            baseItem.setEntry(frame.frameId,frame.data.length,frame.direction,frame.checksumType,frame.data,frame.isEvent?2:1)
            return await baseItem.write(frame)
          }
        }
        for (const c of this.nodeItem.channel) {
          const baseItem = this.linBaseMap.get(c)
          if (baseItem && baseItem.info.name == frame.device) {
            return await baseItem.write(frame)
          }
        }
        throw new Error(`device ${frame.device} not found`)
    
      }
}


export function updateSignalVal(db: LDF, signalName: string, value: number | number[]) {
    const signal = db.signals[signalName]
    if (signal) {
        //compare value
        const lastValue = signal.value != undefined ? signal.value : signal.initValue
        if (!isEqual(lastValue, value)) {
            signal.update = true
        }
        signal.value = value
    }
}
