

import { test, expect, describe, beforeAll,afterAll} from 'vitest'
import { EntityAddr, EthAddr, EthDevice } from '../../src/main/share/doip'
import DOIP, { DOIP_ERROR_ID, DoipError } from '../../src/main/doip'
import { cloneDeep } from 'lodash'
const eth: EthDevice = {
    label: '',
    id: '',
    handle: '127.0.0.1'
}
const ethAddr: EthAddr = {
    name: '',
    taType: 'physical',
    id: '',
    routeActiveTime: 0,
    testerLogicalAddr: 0,
    virReqType: 'broadcast',
    virReqAddr: ''
}
const entity: EntityAddr = {
    vin: 'ecubus-pro111111111111111111111',
    logicalAddr: 0,
    eid: '00-00-00-00-00-00-00-00',
    gid: ''
}
describe('vin request', () => {
    let doip:DOIP
        beforeAll(async()=>{
            doip = new DOIP(eth)
           
        })
    test('vin request', async () => {
      
        const r = await doip.sendVehicleIdentificationRequest(ethAddr, entity)
        expect(r.length).toBe(0)
    })
    test('vin request with vin', async () => {
       
        const r = await doip.sendVehicleIdentificationRequestWithVIN(ethAddr, entity)
        expect(r.length).toBe(0)
    })

    test('vin request with eid', async () => {
       
        const r = await doip.sendVehicleIdentificationRequestWithEID(ethAddr, entity)
        expect(r.length).toBe(0)
    })
    afterAll(()=>{
        doip.close()
    })
})
describe('vin request with resp', () => {
    let doip:DOIP
        beforeAll(async()=>{
            doip = new DOIP(eth)
            await doip.registerEntity(entity,false)
           
        })
    test('vin request', async () => {
      
        const r = await doip.sendVehicleIdentificationRequest(ethAddr, entity)
        expect(r.length).toBe(1)
    })
    test('vin request with vin', async () => {
       
        const r = await doip.sendVehicleIdentificationRequestWithVIN(ethAddr, entity)
        //TODO:
        expect(r.length).toBe(1)
    })

    test('vin request with eid', async () => {
       
        const r = await doip.sendVehicleIdentificationRequestWithEID(ethAddr, entity)
        expect(r.length).toBe(1)
    })
    afterAll(()=>{
        doip.close()
    })
})
describe('announce check',()=>{
    let doip:DOIP
    beforeAll(async()=>{
        doip = new DOIP(eth)
        await doip.registerEntity(entity,true)
    })
    test('entry found',()=>{
        const e = doip.entityMap
        expect(e.size).toBe(1)
    })
    afterAll(()=>{
        doip.close()
    })
})

describe('doip client with self entity',()=>{
    let doip:DOIP
    beforeAll(async()=>{
        doip = new DOIP(eth)
        await doip.registerEntity(entity,false)
    })
    test('connect entity',async ()=>{
        const e =await doip.createClient(ethAddr,entity,'normal')
        await doip.routeActiveRequest(e)
        expect(e.state).toBe('active')
    })

    afterAll(()=>{
        doip.close()
    })
})
describe('doip diag 0x10',()=>{
    let doip:DOIP
    beforeAll(async()=>{
        doip = new DOIP(eth)
        await doip.registerEntity(entity,false)
    })
    test('connect entity',async ()=>{
        const e =await doip.createClient(ethAddr,entity,'normal')
        await doip.routeActiveRequest(e)
        expect(e.state).toBe('active')
    })
    test('write diag request',async ()=>{
       await doip.writeTpReq(ethAddr,entity,Buffer.from([0x10,0x02]))
    })
    test('write diag response',async ()=>{
        await doip.writeTpResp(ethAddr,Buffer.from([0x50,0x02]))
    })

    afterAll(()=>{
        doip.close()
    })
})
describe.skip('doip client without entity',()=>{
    let doip:DOIP
    beforeAll(async()=>{
        doip = new DOIP(eth)
    })
    test('connect entity',async ()=>{
        try{
            const e =await doip.createClient(ethAddr,entity,'normal')
            await doip.routeActiveRequest(e)
            expect(true).toBe(false)
        }catch(e:any){
            expect(e.errorId).toBe(DOIP_ERROR_ID.DOIP_PARAM_ERR)
        }
    })
    afterAll(()=>{
        doip.close()
    })
})


describe.skip('doip client directly',()=>{
    let doip:DOIP
    beforeAll(async()=>{
        doip = new DOIP(eth)
    })
    test('connect entity',async ()=>{
        try{
            const ethAddr1: EthAddr = {
                name: '',
                taType: 'physical',
                id: '',
                routeActiveTime: 0,
                testerLogicalAddr: 0,
                virReqType: 'omit',
                virReqAddr: '192.168.1.1'
            }
            const e =await doip.createClient(ethAddr1,entity,'normal')
            await doip.routeActiveRequest(e)
            expect(true).toBe(false)
        }catch(e:any){
            expect(e.errorId).toBe(DOIP_ERROR_ID.DOIP_TCP_ERROR)
        }
    })
    afterAll(()=>{
        doip.close()
    })
})


describe('doip client twice with same tester',()=>{
    let doip:DOIP
    beforeAll(async()=>{
        doip = new DOIP(eth)
        await doip.registerEntity(entity,false)
    })
    test('connect entity',async ()=>{
        const e =await doip.createClient(ethAddr,entity,'normal')
        await doip.routeActiveRequest(e)
        expect(e.state).toBe('active') 
    })
    test('connect entity again with same tester',async ()=>{
        const ethAddr1=cloneDeep(ethAddr)
        ethAddr1.id='1'
        const e =await doip.createClient(ethAddr1,entity,'normal')
        try{
            await doip.routeActiveRequest(e)
            expect(e.state).toBe('active') 
        }catch(e:any){
            expect(e.errorId).toBe(DOIP_ERROR_ID.DOIP_ROUTE_ACTIVE_ERR)
        }
    })
    afterAll(()=>{
        doip.close()
    })
})

describe.skip('doip client twice with diff tester',()=>{
    let doip:DOIP
    beforeAll(async()=>{
        doip = new DOIP(eth)
        await doip.registerEntity(entity,false)
    })
    test('connect entity',async ()=>{
        const e =await doip.createClient(ethAddr,entity,'normal')
        await doip.routeActiveRequest(e)
        expect(e.state).toBe('active') 
    })
    test('connect entity again with diff tester',async ()=>{
        const ethAddr1: EthAddr = {
            name: '',
            taType: 'physical',
            id: '1',
            routeActiveTime: 0,
            testerLogicalAddr: 1,
            virReqType: 'broadcast',
            virReqAddr: ''
        }
        const e =await doip.createClient(ethAddr1,entity,'normal')
        await doip.routeActiveRequest(e)
        expect(e.state).toBe('active') 
        expect(doip.connectTable.length).toBe(2)
    })
    afterAll(()=>{
        doip.close()
    })
})