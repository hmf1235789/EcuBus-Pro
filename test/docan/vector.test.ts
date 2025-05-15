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
      handle: '2:2',
      name: 'test',
      id: 'VECTOR_2_#CAN',
      vendor: 'vector',
      canfd: true, //false true
      bitrate: {
        sjw: 1,
        timeSeg1: 13,
        timeSeg2: 2,
        preScaler: 10,
        freq: 500000,
        clock: '80'
      },
      bitratefd: {
        sjw: 1,
        timeSeg1: 7,
        timeSeg2: 2,
        preScaler: 4,
        freq: 2000000,
        clock: '80'
      }
    })
  })

  test('write multi frame', async () => {
    // const list = []
    // for (let i = 0; i < 10; i++) {
    //   list.push(
    //     client.writeBase(
    //       3,
    //       {
    //         idType: CAN_ID_TYPE.STANDARD,
    //         brs: false,
    //         canfd: false, //false true
    //         remote: false
    //       },
    //       Buffer.alloc(8, i)
    //     )
    //   )
    // }
    // const r = await Promise.all(list)
    // console.log(r)
  })

  afterAll(() => {
    client.close()
  })
})
