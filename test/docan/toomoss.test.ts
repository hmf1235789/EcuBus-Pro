import { TOOMOSS_CAN } from '../../src/main/docan/toomoss'
import { equal, deepEqual } from 'assert'
import { describe, it, beforeAll, afterAll, test } from 'vitest'
import * as path from 'path'
import {
    addrToId,
    CAN_ADDR_FORMAT,
    CAN_ADDR_TYPE,
    CAN_ID_TYPE,
    CAN_SOCKET,
    CanAddr,
    swapAddr
} from '../../src/main/share/can'
import { CanTp } from 'src/main/docan/cantp'


const dllPath = path.join(__dirname, '../../resources/lib')
TOOMOSS_CAN.loadDllPath(dllPath)

test('toomoss scan device', () => {
    const devices = TOOMOSS_CAN.getValidDevices()
    console.log(devices)
})

describe('toomoss test', () => {
    let client!: TOOMOSS_CAN
    let client2!: TOOMOSS_CAN
    beforeAll(() => {
        client = new TOOMOSS_CAN({
            handle: '1417675180:0',
            name: 'test',
            id: 'toomoss',
            vendor: 'toomoss',
            canfd: false,
            bitrate: {
                freq: 250000,
                preScaler: 2,
                timeSeg1: 68,
                timeSeg2: 11,
                sjw: 11,
                clock: '40M'
            },
            bitratefd: {
                freq: 1000000,
                preScaler: 1,
                timeSeg1: 20,
                timeSeg2: 19,
                sjw: 19
            },
            database: ''

        })
        client2 = new TOOMOSS_CAN({
            handle: '1417675180:1',
            name: 'test2',
            id: 'toomoss',
            vendor: 'toomoss',
            canfd: false,
            bitrate: {
                freq: 500000,
                preScaler: 1,
                timeSeg1: 68,
                timeSeg2: 11,
                sjw: 11,
                clock: '40M'
            },
            bitratefd: {
                freq: 1000000,
                preScaler: 1,
                timeSeg1: 20,
                timeSeg2: 19,
                sjw: 19
            },
            database: ''

        })
    })
    test('write multi frame', async () => {

        const list = []
        for (let i = 0; i < 1; i++) {
            list.push(client.writeBase(3+i, {
                idType: CAN_ID_TYPE.STANDARD,
                brs: false,
                canfd: false,
                remote: false
            }, Buffer.alloc(8, 0x33))
            )
        }
        const r = await Promise.all(list)
        console.log(r)

    })
    afterAll(() => {
        setTimeout(() => {
            client.close()
        }, 2000);
    })

})