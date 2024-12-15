import { PeakLin} from '../../src/main/dolin/peak'
import { equal, deepEqual } from 'assert'
import { describe, it, beforeAll, afterAll, test } from 'vitest'
import * as path from 'path'



const dllPath = path.join(__dirname, '../../resources/lib')
PeakLin.loadDllPath(dllPath)

test("plin get device",()=>{
    const v=PeakLin.getValidDevices()
    equal(v.length,2)

})

// describe('peak test', () => {
//     let client!: PEAK_TP
//     beforeAll(() => {
//         client = new PEAK_TP({
//             handle: 81,
//             name: 'test',
//             id: 'peak',
//             vendor: 'peak',
//             canfd: false,
//             bitrate: {
//                 preScaler: 80,
//                 timeSeg1: 2,
//                 timeSeg2: 1,
//                 sjw: 1,
//                 freq: 250000, clock: '80'
//             },
//             bitratefd: {
//                 preScaler: 8,
//                 timeSeg1: 3,
//                 timeSeg2: 1,
//                 sjw: 1,
//                 freq: 2000000
//             },


//         })
//     })
//     test('write multi frame', async () => {
      
//         const list = []
//         for (let i = 0; i < 400; i++) {
//             list.push(client.writeBase(3, {
//                 idType: CAN_ID_TYPE.STANDARD,
//                 brs: false,
//                 canfd: false,
//                 remote: false
//             }, Buffer.alloc(8, i))
//             )
//         }
//         const r=await Promise.all(list)
//         console.log(r)  

//     })
//     afterAll(() => {
//         client.close()
//     })

// })