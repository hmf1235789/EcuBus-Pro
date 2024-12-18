import { getPID, LIN_ERROR_ID, LinChecksumType, LinDevice, LinDirection, LinError, LinMode, LinMsg } from '../../share/lin'
import LIN from '../build/Release/peakLin.node'
import { v4 } from 'uuid'
import { queue, QueueObject } from 'async'
import { LinLOG } from 'src/main/log'
import EventEmitter from 'events'




function err2Str(result: number): string {
    const buffer = Buffer.alloc(256)
    LIN.LIN_GetErrorText(result, 9, buffer)
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
    private queue = queue((task: { resolve: any; reject: any; data: LinMsg }, cb) => {
        this._write(task.data).then(task.resolve).catch(task.reject).finally(cb)
    }, 1)
    private client: number
    private lastFrame:Map<number,LinMsg>=new Map()
    private entryTable: Record<number, {
        frameId: number
        dir: number
        checksumType: number
        length: number

    }> = {}
    event = new EventEmitter()
    pendingPromise?: {
        resolve: (msg: LinMsg, ts: number) => void
        reject: (error: LinError) => void
        sendMsg: LinMsg
    }
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
    log: LinLOG
    constructor(private device: LinDevice, private mode: LinMode, private baud: number) {
        this.client = this.registerClient()
        this.connectClient(this.client, device)
        this.initHardware(device, this.client, mode == LinMode.MASTER, baud)
        LIN.LIN_RegisterFrameId(this.client, this.device.handle, 0, 0x3F)
        LIN.CreateTSFN(this.client, this.device.label, this.callback.bind(this))
        this.log = new LinLOG('PEAK', this.device.label, this.event)
        // this.getEntrys()
        // this.wakeup()
    }
    getEntrys() {
        //get entry
        for (let i = 0; i < 0x3F; i++) {
            const entry = new LIN.TLINFrameEntry()
            entry.FrameId = i
            const result = LIN.LIN_GetFrameEntry(this.device.handle, entry)
            if (result != 0) {
                throw new LinError(LIN_ERROR_ID.LIN_PARAM_ERROR, undefined, err2Str(result))
            }
            this.entryTable[i] = {
                frameId: entry.FrameId,
                dir: entry.Direction,
                checksumType: entry.ChecksumType,
                length: entry.Length
            }
        }
        console.log('entryTable', this.entryTable)
    }
    async callback() {

        const recvMsg = new LIN.TLINRcvMsg()
        const ret = LIN.LIN_Read(this.client, recvMsg)
        if (ret == 0) {
            const ts = recvMsg.TimeStamp
            if (recvMsg.Type == 0) {
                //mstStandard
                const a = new LIN.ByteArray.frompointer(recvMsg.Data)
                const data = Buffer.alloc(recvMsg.Length)
                for (let i = 0; i < recvMsg.Length; i++) {
                    data[i] = a.getitem(i)
                }



                const msg: LinMsg = {
                    frameId: recvMsg.FrameId,
                    data: data,
                    direction: recvMsg.Direction == 1 ? LinDirection.SEND : (recvMsg.Direction == 2 ? LinDirection.RECV : LinDirection.RECV_AUTO_LEN),
                    checksumType: recvMsg.ChecksumType == 1 ? LinChecksumType.CLASSIC : LinChecksumType.ENHANCED,
                    checksum: recvMsg.Checksum,
                    ts: ts
                }
                if(recvMsg.ErrorFlags==0){
                    this.lastFrame.set(msg.frameId,msg)
                }
                const error: string[] = []
                const handle = () => {

                    if (recvMsg.ErrorFlags & 1) {
                        error.push('Error on Synchronization field')
                    }
                    if (recvMsg.ErrorFlags & 2) {
                        error.push('Wrong parity Bit 0')
                    }
                    if (recvMsg.ErrorFlags & 4) {
                        error.push('Wrong parity Bit 1')
                    }
                    if (recvMsg.ErrorFlags & 8) {
                        error.push('Slave not responding error')
                    }
                    if (recvMsg.ErrorFlags & 16) {
                        error.push('A timeout was reached')
                    }
                    if (recvMsg.ErrorFlags & 32) {
                        error.push('Wrong checksum')
                    }
                    if (recvMsg.ErrorFlags & 64) {
                        error.push('Bus shorted to ground')
                    }
                    if (recvMsg.ErrorFlags & 128) {
                        error.push('Bus shorted to Vbat')
                    }
                    if (recvMsg.ErrorFlags & 256) {
                        error.push('A slot time (delay) was too smallt')
                    }
                    if (recvMsg.ErrorFlags & 512) {
                        error.push(' Response was received from other station')
                    }
                }

                if (this.pendingPromise && this.pendingPromise.sendMsg.frameId == (msg.frameId & 0x3f)) {
                    if (recvMsg.ErrorFlags != 0) {
                        handle()
                        this.log.error(ts, error.join(', '))
                        this.pendingPromise.reject(new LinError(LIN_ERROR_ID.LIN_BUS_ERROR, msg, error.join(', ')))
                    } else {
                        this.log.linBase(msg)
                        this.event.emit(`${msg.frameId}`, msg)
                        this.pendingPromise.resolve(msg, ts)
                    }
                    this.pendingPromise = undefined
                } else {
                    if (recvMsg.ErrorFlags != 0) {
                        handle()
                        this.log.error(ts, error.join(', '))
                    } else {
                        this.log.linBase(msg)
                        this.event.emit(`${msg.frameId}`, msg)
                    }
                }

            } else if (recvMsg.Type == 1) {
                this.log.linBase('busSleep')
            } else if (recvMsg.Type == 2) {
                this.log.linBase('busWakeUp')
            } else {
                this.log.error(ts, 'internal error')
            }
            //让出时间片
            await new Promise((resolve) => {
                setImmediate(() => {
                    resolve(null)
                })
            })
            await this.callback()

        }
    }
    close() {

        LIN.FreeTSFN(this.device.label)
        LIN.LIN_ResetHardwareConfig(this.client, this.device.handle)

        LIN.LIN_DisconnectClient(this.client, this.device.handle)

        LIN.LIN_RemoveClient(this.client)


    }
    async _write(m: LinMsg): Promise<number> {
        const msg = new LIN.TLINMsg()
        msg.FrameId = getPID(m.frameId)
        msg.Length = Math.min(m.data.length, 8)
        msg.Direction = m.direction == LinDirection.SEND ? 1 : (m.direction == LinDirection.RECV ? 2 : 3)
        msg.ChecksumType = m.checksumType == LinChecksumType.CLASSIC ? 1 : 2
        return new Promise<number>((resolve, reject) => {
            let result = 0

            if (this.mode == LinMode.MASTER) {
                if (this.pendingPromise != undefined) {
                    reject(new LinError(LIN_ERROR_ID.LIN_BUS_BUSY, m))
                    return
                }
                if (m.direction == LinDirection.SEND) {
                    const a = new LIN.ByteArray.frompointer(msg.Data)
                    for (let i = 0; i < msg.Length; i++) {
                        // msg.Data.setitem(i,data[i])
                        a.setitem(i, m.data[i])
                    }

                    result = LIN.LIN_CalculateChecksum(msg)
                    if (result != 0) {
                        reject(new LinError(LIN_ERROR_ID.LIN_PARAM_ERROR, m, err2Str(result)))
                        return
                    }
                }
                result = LIN.LIN_Write(this.client, this.device.handle, msg)

                if (result != 0) {
                    reject(new LinError(LIN_ERROR_ID.LIN_PARAM_ERROR, m, err2Str(result)))
                    return
                }

                this.pendingPromise = {
                    resolve: (msg, ts) => resolve(ts),
                    reject,
                    sendMsg: m
                }


            } else {
                //set entry
                
                const entry = new LIN.TLINFrameEntry()
                entry.FrameId = m.frameId
                entry.Direction = m.direction == LinDirection.SEND ? 1 : (m.direction == LinDirection.RECV ? 2 : 3)
                entry.ChecksumType = m.checksumType == LinChecksumType.CLASSIC ? 1 : 2
                entry.Length = m.data.length
                entry.Flags=LIN.FRAME_FLAG_RESPONSE_ENABLE|LIN.FRAME_FLAG_IGNORE_INIT_DATA
                result = LIN.LIN_SetFrameEntry(this.device.handle, entry)
                if (result != 0) {
                    reject(new LinError(LIN_ERROR_ID.LIN_PARAM_ERROR, m, err2Str(result)))
                    return
                }
                //update entry
                const a=new LIN.ByteArray(m.data.length)
                for(let i=0;i<m.data.length;i++){
                    a.setitem(i,m.data[i])
                }
                result = LIN.LIN_UpdateByteArray(this.client, this.device.handle, m.frameId,0,m.data.length,a.cast())
            }
        })







    }
    async write(m: LinMsg): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            this.queue.push({ resolve, reject, data: m })
        })
    }
    read(frameId:number){
        return this.lastFrame.get(frameId)
    }
    wakeup() {

        const result = LIN.LIN_XmtWakeUp(this.client, this.device.handle)
        if (result != 0) {
            throw new LinError(LIN_ERROR_ID.LIN_INTERNAL_ERROR, undefined, err2Str(result))
        }

    }
    getStatus() {
        const status = new LIN.TLINHardwareStatus()
        LIN.LIN_GetStatus(this.device.handle, status)
        return {
            master: status.Mode == 2,
            status: status.Status,
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
            throw new LinError(LIN_ERROR_ID.LIN_PARAM_ERROR, undefined, err2Str(result))
        }
        return client.value()

    }


    private connectClient(client: number, device: LinDevice) {
        const result = LIN.LIN_ConnectClient(client, device.handle)
        if (result != 0) {
            throw new LinError(LIN_ERROR_ID.LIN_PARAM_ERROR, undefined, err2Str(result))
        }
    }
    private initHardware(device: LinDevice, client: number, master: boolean, baud: number) {
        const result = LIN.LIN_InitializeHardware(client, device.handle, master ? 2 : 1, baud)
        if (result != 0) {
            throw new LinError(LIN_ERROR_ID.LIN_PARAM_ERROR, undefined, err2Str(result))
        }
    }
}