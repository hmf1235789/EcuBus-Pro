import { PeakLin } from '../../src/main/dolin/peak'
import { equal, deepEqual } from 'assert'
import { describe, it, beforeAll, afterAll, test } from 'vitest'
import * as path from 'path'
import { LinChecksumType, LinDirection, LinMode } from 'src/main/share/lin'



const dllPath = path.join(__dirname, '../../resources/lib')
PeakLin.loadDllPath(dllPath)

test("peak lin get device", () => {
    const v = PeakLin.getValidDevices()
    console.log(v)
    equal(v.length, 2)

})

const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))
describe('peak lin master', () => {
    let client!: PeakLin
    beforeAll(async () => {
        client = new PeakLin({
            handle: 1,
            label: 'lin1',
            id: 'lin1',
        }, LinMode.MASTER, 19200)
    })

    test('write frames', async () => {



        const w1 = client.write({
            frameId: 0x2,
            data: Buffer.from([0x01, 0x11, 0x03, 0x04]),
            direction: LinDirection.SEND,
            checksumType: LinChecksumType.CLASSIC
        })
        const w2 = client.write({
            frameId: 0x3,
            data: Buffer.from([0x01, 0x11, 0x03, 0x04]),
            direction: LinDirection.SEND,
            checksumType: LinChecksumType.CLASSIC
        })
        await Promise.all([w1, w2])




    })
    afterAll(() => {
        client.close()
    })

})