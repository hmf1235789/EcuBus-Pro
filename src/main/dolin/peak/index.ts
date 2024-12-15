import { LinChecksumType, LinDevice, LinDirection } from '../../share/lin'
import LIN from '../build/Release/peakLin.node'
import { v4 } from 'uuid'





function err2Str(result: number): string {
    const buffer = Buffer.alloc(256)
    LIN.LIN_GetErrorString(result, 9, buffer)
    return buffer.toString()
}

function buf2str(buf: Buffer) {
    const nullCharIndex = buf.indexOf(0) // 0 是 '\0' 的 ASCII 码
    if (nullCharIndex === -1) {
        return buf.toString('utf8')
    }
    return buf.toString('utf8', 0, nullCharIndex)
}



export class PeakLin {
    private client: number
    static loadDllPath(dllPath: string) {
        LIN.LoadDll(dllPath)
    }
    static getLibVersion() {
        const v = new LIN.TLINVersion()
        const result = LIN.LIN_GetVersion(v)
        if (result == 0) {
            return `${v.Major}.${v.Minor}.${v.Revision}.${v.Build}`
        } else {
            throw new Error(err2Str(result))
        }
    }
    constructor(private device: LinDevice, private master: boolean, private baud: number) {
        this.client = this.registerClient()
        this.connectClient(this.client, device)
        this.initHardware(device, this.client, master, baud)
        LIN.CreateTSFN(this.client, this.device.label, this.callback.bind(this))
    }
    callback() {
        console.log('callback')
    }
    close() {
        LIN.LIN_ResetHardwareConfig(this.client, this.device.handle)
        LIN.LIN_DisconnectClient(this.client, this.device.handle)
        LIN.LIN_RemoveClient(this.client)
        LIN.FreeTSFN(this.device.label)
    }
    async write(frameId: number, data: Buffer, dir: LinDirection, checksumType: LinChecksumType) {
        const msg = new LIN.TLINMsg()
        msg.FrameId = frameId
        msg.Length = Math.min(data.length, 8)
        msg.Direction = dir == LinDirection.SEND ? 1 : 2
        msg.ChecksumType = checksumType == LinChecksumType.CLASSIC ? 1 : 2


        let result = 0
        if (dir == LinDirection.SEND) {
            //apply data
            msg.Data = data

        }
        if (this.master) {
            result = LIN.LIN_CalculateChecksum(msg)
            if (result != 0) {
                throw new Error(err2Str(result))
            }
        }else{
            //update
        }
        result = LIN.LIN_Write(this.client, this.device.handle, msg)
        if (result != 0) {
            throw new Error(err2Str(result))
        }






    }




    static getValidDevices(): LinDevice[] {
        const devices: LinDevice[] = []
        const dd = new LIN.HLINHW_JS(100);
        const count = new LIN.INT_JS()
        const result = LIN.LIN_GetAvailableHardware(dd.cast(), 100, count.cast())

        if (result == 0) {
            for (let i = 0; i < count.value(); i++) {
                const handle = dd.getitem(i)
                const labelBuffer = Buffer.alloc(256)
                LIN.LIN_GetHardwareParam(handle, LIN.hwpName, labelBuffer)
                devices.push({
                    label: `${buf2str(labelBuffer)} (${handle})`,
                    id: handle.toString(),
                    handle
                })
            }
            return devices
        } else {
            throw new Error(err2Str(result))
        }
    }
    private registerClient() {
        const clientName = v4()
        const client = new LIN.HLINCLIENT_JS()
        const result = LIN.LIN_RegisterClient(clientName, 0, client.cast())
        if (result != 0) {
            throw new Error(err2Str(result))
        }
        return client.value()

    }


    private connectClient(client: number, device: LinDevice) {
        const result = LIN.LIN_ConnectClient(client, device.handle)
        if (result != 0) {
            throw new Error(err2Str(result))
        }
    }
    private initHardware(device: LinDevice, client: number, master: boolean, baud: number) {
        const result = LIN.LIN_InitializeHardware(client, device.handle, master ? 2 : 1, baud)
        if (result != 0) {
            throw new Error(err2Str(result))
        }
    }
}