import { VECTOR_CAN } from '../../src/main/docan/vector'
import { equal, deepEqual } from 'assert'
import { describe, it, beforeAll, afterAll, test } from 'vitest'
import * as path from 'path'
import {
  addrToId,
  CAN_ADDR_FORMAT,
  CAN_ADDR_TYPE,
  CAN_ID_TYPE,
  CanAddr,
  swapAddr
} from '../../src/main/share/can'
import { CanTp } from 'src/main/docan/cantp'

const dllPath = path.join(__dirname, '../../resources/lib')
VECTOR_CAN.loadDllPath(dllPath)

// test('vector devices', () => {
//   const devices = VECTOR_CAN.getValidDevices()
//   console.log(devices)
// })

describe('vector test', () => {
  let client!: VECTOR_CAN
  beforeAll(() => {
    client = new VECTOR_CAN({
      handle: '0:0',
      name: 'test',
      id: 'VECTOR_2_#CAN',
      vendor: 'vector',
      canfd: true, //false true
      bitrate: {
        freq: 500000,
        preScaler: 2,
        timeSeg1: 68,
        timeSeg2: 11,
        sjw: 11
      },
      bitratefd: {
        freq: 2000000,
        preScaler: 1,
        timeSeg1: 20,
        timeSeg2: 19,
        sjw: 19
      }
    })
  })

  //   test('write multi frame', async () => {
  //     const list = []
  //     for (let i = 0; i < 10; i++) {
  //       list.push(
  //         client.writeBase(
  //           3,
  //           {
  //             idType: CAN_ID_TYPE.STANDARD,
  //             brs: false,
  //             canfd: false,
  //             remote: false
  //           },
  //           Buffer.alloc(8, i)
  //         )
  //       )
  //     }
  //     const r = await Promise.all(list)
  //     console.log(r)
  //   })
  afterAll(() => {
    client.close()
  })
})
