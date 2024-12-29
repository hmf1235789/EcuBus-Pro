import { UdsDevice } from "../share/uds";
import { PeakLin } from "./peak";
import dllLib from '../../../resources/lib/zlgcan.dll?asset&asarUnpack'
import path from "path";
import { LinBaseInfo, LinChecksumType, LinDevice, LinDirection, LinNode } from "../share/lin";
import { LDF } from "src/renderer/src/database/ldfParse";
import EventEmitter from "events";
import { isEqual } from "lodash";

export abstract class LinBase {
    constructor() {
    }
    abstract event: EventEmitter
    static getValidDevices(): LinDevice[] {
        throw new Error('Method not implemented.')
    }
    abstract db?: LDF
    abstract close(): void
    abstract setEntry(frameId: number, length: number, dir: LinDirection, checksumType: LinChecksumType, initData: Buffer, flag: number): void
    abstract registerNode(nodeName:string):void
}


const libPath = path.dirname(dllLib)
PeakLin.loadDllPath(libPath)



export function openLinDevice(device: LinBaseInfo) {
    let canBase: LinBase | undefined



    // #v-ifdef IGNORE_NODE!='1'
    if (device.vendor == 'peak') {
        canBase = new PeakLin(device.device, device.mode, device.baudRate)
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


export class LinNodeSocket {
    cb: any
    db?: LDF
    constructor(private base: LinBase, private nodeItem: LinNode) {
        this.cb = this.signalHandle.bind(this)
        if (nodeItem.database) {
            const db = global.database.lin[nodeItem.database]
            if (db) {

                this.db = db
                db.event.on('signal', this.cb)
            }
        }
    }
    close() {
        if (this.db) {
            this.db.event.removeListener('signal', this.cb)
        }
    }
    signalHandle(signalName: string, value: number | number[]) {

    }
}


export function updateSignalVal(db: LDF, signalName: string, value: number | number[]) {
    const signal = db.signals[signalName]
    if (signal) {
        //compare value
        const lastValue = signal.value != undefined ? signal.value : signal.initValue
        if (!isEqual(lastValue, value)) {
            signal.update = true
            // db.event.emit(signalName,value)
            db.event.emit('signal', signalName, value)
        }
        signal.value = value
    }
}
