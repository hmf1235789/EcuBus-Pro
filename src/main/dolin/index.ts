import { UdsDevice } from "../share/uds";
import { PeakLin } from "./peak";
import dllLib from '../../../resources/lib/zlgcan.dll?asset&asarUnpack'
import path from "path";
import { LinBase, LinBaseInfo } from "../share/lin";


const libPath = path.dirname(dllLib)
PeakLin.loadDllPath(libPath)



export function openLinDevice(device: LinBaseInfo) {
    let canBase: LinBase | undefined



    // #v-ifdef IGNORE_NODE!='1'
    if (device.vendor == 'peak') {
        canBase = new PeakLin(device.device,device.mode,device.baudRate)
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