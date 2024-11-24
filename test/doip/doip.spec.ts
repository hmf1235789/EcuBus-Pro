

import {test,expect} from 'vitest'
import { EntityAddr, EthAddr, EthDevice } from '../../src/main/share/doip'
import DOIP from '../../src/main/doip'
const eth:EthDevice={
    label: '',
    id: '',
    handle: '127.0.0.1'
}
const ethAddr:EthAddr={
    name: '',
    taType: 'physical',
    id: '',
    routeActiveTime: 0,
    testerLogicalAddr: 0,
    virReqType: 'broadcast',
    virReqAddr: ''
}
const entity:EntityAddr={
    vin: '',
    logicalAddr: 0,
    eid: '',
    gid: ''
}

test('doip send vin',async ()=>{
   const doip=new DOIP(eth)
   const r=await doip.sendVehicleIdentificationRequest(ethAddr,entity)
    expect(r.length).toBe(0)
})