import {
    CanAddr,
    CanBase,
    CAN_ID_TYPE,
    CanMsgType,
    CAN_ERROR_ID,
    getLenByDlc,
    CanBaseInfo,
    CanDevice,
    getTsUs,
    CanMessage
} from '../../share/can'
import { EventEmitter } from 'events'
import { cloneDeep } from 'lodash'
import { addrToId, CanError } from '../../share/can'
import { CanLOG } from '../../log'
import TOOMOSS from './../build/Release/toomoss.node'
import { platform } from 'os'

interface CANFrame {
    canId: number
    msgType: CanMsgType
    data: Buffer
    ts: number
}

export class TOOMOSS_CAN extends CanBase {
    // 添加静态设备管理Map
    private static deviceHandles = new Map<number, {
        refCount: number,  // 引用计数
        channels: Set<number>  // 当前使用的通道
    }>();

    event: EventEmitter
    info: CanBaseInfo
    handle: number
    channel: number = 0
    deviceIndex: number
    closed = false
    cnt = 0
    id: string
    log: CanLOG
    canConfig: any
    canfdConfig: any
    startTime = getTsUs()
    tsOffset: number | undefined
    private readAbort = new AbortController()
    pendingBaseCmds = new Map<
        string,
        {
            resolve: (value: number) => void
            reject: (reason: CanError) => void
            msgType: CanMsgType
            data: Buffer
            extra?: { database?: string; name?: string }
        }[]
    >()

    rejectBaseMap = new Map<
        number,
        {
            reject: (reason: CanError) => void
            msgType: CanMsgType
        }
    >()

    constructor(info: CanBaseInfo) {
        super()
        this.id = info.id
        this.info = info

        const devices = TOOMOSS_CAN.getValidDevices()
        const target = devices.find((item) => item.handle == info.handle)
        if (!target) {
            throw new Error('Invalid handle')
        }

        // 检查波特率配置
        const CLOCK = 40_000_000 // 40MHz时钟

        // 检查普通CAN波特率
        if (info.bitrate.freq) {
            const calcFreq = Math.floor(CLOCK / (info.bitrate.preScaler * (1 + info.bitrate.timeSeg1 + info.bitrate.timeSeg2)))
            // 允许1%的误差
            if (Math.abs(calcFreq - info.bitrate.freq) / info.bitrate.freq > 0.01) {
                throw new Error(
                    `Invalid CAN bitrate config: expected ${info.bitrate.freq}, got ${calcFreq}. ` +
                    `preScaler=${info.bitrate.preScaler}, ` +
                    `timeSeg1=${info.bitrate.timeSeg1}, ` +
                    `timeSeg2=${info.bitrate.timeSeg2}`
                )
            }
        }

        // 检查CANFD波特率
        if (info.canfd && info.bitratefd?.freq) {
            // 检查仲裁域波特率
            const calcNbtFreq = Math.floor(CLOCK / (info.bitrate.preScaler * (1 + info.bitrate.timeSeg1 + info.bitrate.timeSeg2)))
            if (Math.abs(calcNbtFreq - info.bitrate.freq) / info.bitrate.freq > 0.01) {
                throw new Error(
                    `Invalid CANFD NBT config: expected ${info.bitrate.freq}, got ${calcNbtFreq}. ` +
                    `preScaler=${info.bitrate.preScaler}, ` +
                    `timeSeg1=${info.bitrate.timeSeg1}, ` +
                    `timeSeg2=${info.bitrate.timeSeg2}`
                )
            }

            // 检查数据域波特率
            const calcDbtFreq = Math.floor(CLOCK / (info.bitratefd.preScaler * (1 + info.bitratefd.timeSeg1 + info.bitratefd.timeSeg2)))
            if (Math.abs(calcDbtFreq - info.bitratefd.freq) / info.bitratefd.freq > 0.01) {
                throw new Error(
                    `Invalid CANFD DBT config: expected ${info.bitratefd.freq}, got ${calcDbtFreq}. ` +
                    `preScaler=${info.bitratefd.preScaler}, ` +
                    `timeSeg1=${info.bitratefd.timeSeg1}, ` +
                    `timeSeg2=${info.bitratefd.timeSeg2}`
                )
            }
        }

        this.event = new EventEmitter()
        this.log = new CanLOG('TOOMOSS', info.name, this.event)

        this.handle = parseInt(info.handle.split(':')[0])
        this.deviceIndex = parseInt(info.handle.split(':')[1])

        let ret = 0
        // 检查设备是否已经打开
        let deviceInfo = TOOMOSS_CAN.deviceHandles.get(this.handle)
        if (!deviceInfo) {
            // 首次打开设备
            ret = TOOMOSS.USB_OpenDevice(this.handle)
            if (ret != 1) {
                throw new Error('Open device failed')
            }
            deviceInfo = {
                refCount: 1,
                channels: new Set([this.deviceIndex])
            }
            TOOMOSS_CAN.deviceHandles.set(this.handle, deviceInfo)
        } else {
            // 设备已打开，检查通道是否已被使用
            if (deviceInfo.channels.has(this.deviceIndex)) {
                throw new Error(`Channel ${this.deviceIndex} is already in use`)
            }
            deviceInfo.refCount++
            deviceInfo.channels.add(this.deviceIndex)
        }

        // 初始化CAN配置
        if (info.canfd && info.bitratefd) {
            // CANFD配置
            this.canfdConfig = new TOOMOSS.CANFD_INIT_CONFIG()
            this.canfdConfig.Mode = 0 // 正常模式
            this.canfdConfig.ISOCRCEnable = 1
            this.canfdConfig.RetrySend = 0
            this.canfdConfig.ResEnable = 0
            // 仲裁域波特率配置
            this.canfdConfig.NBT_BRP = info.bitrate.preScaler
            this.canfdConfig.NBT_SEG1 = info.bitrate.timeSeg1
            this.canfdConfig.NBT_SEG2 = info.bitrate.timeSeg2
            this.canfdConfig.NBT_SJW = info.bitrate.sjw
            // 数据域波特率配置
            this.canfdConfig.DBT_BRP = info.bitratefd.preScaler
            this.canfdConfig.DBT_SEG1 = info.bitratefd.timeSeg1
            this.canfdConfig.DBT_SEG2 = info.bitratefd.timeSeg2
            this.canfdConfig.DBT_SJW = info.bitratefd.sjw
            this.canfdConfig.TDC = 0

            ret = TOOMOSS.CANFD_Init(this.handle, this.deviceIndex, this.canfdConfig)
            if (ret != 0) {
                throw new Error('Init CANFD failed')
            }

            //   // 启动CANFD
            //   ret = TOOMOSS.CANFD_Start(this.handle, this.deviceIndex)
            //   if (ret != 0) {
            //     throw new Error('Start CANFD failed')
            //   }

        } else {
            // 普通CAN配置
            this.canConfig = new TOOMOSS.CAN_INIT_CONFIG()
            this.canConfig.CAN_BRP = info.bitrate.preScaler
            this.canConfig.CAN_SJW = info.bitrate.sjw
            this.canConfig.CAN_BS1 = info.bitrate.timeSeg1
            this.canConfig.CAN_BS2 = info.bitrate.timeSeg2
            this.canConfig.CAN_Mode = 0  // 正常模式
            this.canConfig.CAN_ABOM = 0  // 自动离线恢复
            this.canConfig.CAN_NART = 1  // 自动重传
            this.canConfig.CAN_RFLM = 0  // 接收FIFO锁定模式
            this.canConfig.CAN_TXFP = 0  // 发送FIFO优先级

            ret = TOOMOSS.CAN_Init(this.handle, this.deviceIndex, this.canConfig)
            if (ret != 0) {
                throw new Error('Init CAN failed')
            }

            // 启动CAN
            // ret = TOOMOSS.CAN_StartGetMsg(this.handle, this.deviceIndex)
            // if (ret != 0) {
            //     throw new Error('Start CAN failed')
            // }
        }

        // 启动消息接收
        TOOMOSS.CreateTSFN(
            this.handle,
            this.deviceIndex,
            info.canfd,
            this.id,
            this.callback.bind(this),
            this.id + 'error',
            this.callbackError.bind(this)
        )
    }

    callback(msg: any) {
        console.log('msg', this.info.name, msg)
        if(msg.id==0xffffffff){
            return
        }
        const frame: CANFrame = {
            canId: msg.ID & 0x1fffffff,
            msgType: {
                idType: msg.ID & 0x80000000 ? CAN_ID_TYPE.EXTENDED : CAN_ID_TYPE.STANDARD,
                remote: msg.ID & 0x40000000 ? true : false,
                canfd: this.info.canfd,
                brs: false
            },
            data: msg.Data,
            ts: msg.TimeStamp * 100 // 转换为微秒
        }

        if (this.info.canfd) {
            // CANFD消息处理
            frame.msgType.brs = (msg.Flags & 0x01) ? true : false
            frame.msgType.canfd = (msg.Flags & 0x04) ? true : false

            // CANFD的DLC需要转换为实际长度
            let actualLen = 0
            if (msg.DLC <= 8) {
                actualLen = msg.DLC
            } else if (msg.DLC == 9) {
                actualLen = 12
            } else if (msg.DLC == 10) {
                actualLen = 16
            } else if (msg.DLC == 11) {
                actualLen = 20
            } else if (msg.DLC == 12) {
                actualLen = 24
            } else if (msg.DLC == 13) {
                actualLen = 32
            } else if (msg.DLC == 14) {
                actualLen = 48
            } else if (msg.DLC == 15) {
                actualLen = 64
            }

            // 确保data长度正确
            if (frame.data.length > actualLen) {
                frame.data = frame.data.subarray(0, actualLen)
            }
        } else {
            // 普通CAN消息处理
            frame.msgType.brs = false
            frame.msgType.canfd = false

            // 普通CAN最大8字节
            if (frame.data.length > 8) {
                frame.data = frame.data.subarray(0, 8)
            }
        }

        this._read(frame)
    }

    callbackError(err: any) {
        console.log('err',this.info.name, err)
        this.log.error(getTsUs() - this.startTime, 'bus error')
        this.close(true)
    }
    setOption(cmd: string, val: any): void {
        null
    }
    _read(frame: CANFrame) {
        if (this.tsOffset == undefined) {
            this.tsOffset = frame.ts - (getTsUs() - this.startTime)
        }
        const ts = frame.ts - this.tsOffset

        const cmdId = this.getReadBaseId(frame.canId, frame.msgType)
        const message: CanMessage = {
            device: this.info.name,
            dir: 'IN',
            id: frame.canId,
            data: frame.data,
            ts: ts,
            msgType: frame.msgType
        }

        this.log.canBase(message)
        this.event.emit(cmdId, message)
    }

    static loadDllPath(dllPath: string) {
        if (process.platform == 'win32') {
            TOOMOSS.LoadDll(dllPath)
        }
    }

    static override getValidDevices(): CanDevice[] {
        const devices: CanDevice[] = []
        if (process.platform == 'win32') {
            const deviceHandle = new TOOMOSS.I32Array(10)
            const ret = TOOMOSS.USB_ScanDevice(deviceHandle)
            if (ret > 0) {
                for (let i = 0; i < ret; i++) {
                    const v = deviceHandle.getitem(i)
                    devices.push({
                        label: `TOOMOSS_USB_${i}_INDEX_0`,
                        id: `TOOMOSS_USB_${i}_INDEX_0`,
                        handle: `${v}:0`
                    })
                    devices.push({
                        label: `TOOMOSS_USB_${i}_INDEX_1`,
                        id: `TOOMOSS_USB_${i}_INDEX_1`,
                        handle: `${v}:1`
                    })
                }
            }
        }
        return devices
    }

    static override getLibVersion(): string {
        return '1.8.6.0'
    }

    close(isReset = false, msg?: string) {
        this.readAbort.abort()

        for (const [key, value] of this.rejectBaseMap) {
            value.reject(new CanError(CAN_ERROR_ID.CAN_BUS_CLOSED, value.msgType))
        }
        this.rejectBaseMap.clear()

        for (const [key, vals] of this.pendingBaseCmds) {
            for (const val of vals) {
                val.reject(new CanError(CAN_ERROR_ID.CAN_BUS_CLOSED, val.msgType))
            }
        }
        this.pendingBaseCmds.clear()

        if (isReset) {
            if (this.info.canfd) {
                TOOMOSS.CANFD_Stop(this.handle, this.deviceIndex)
                TOOMOSS.CANFD_ClearMsg(this.handle, this.deviceIndex)
                TOOMOSS.CANFD_Init(this.handle, this.deviceIndex, this.canfdConfig)
            } else {
                TOOMOSS.CAN_ClearMsg(this.handle, this.deviceIndex)
                TOOMOSS.CAN_Stop(this.handle, this.deviceIndex)
                TOOMOSS.CAN_Init(this.handle, this.deviceIndex, this.canConfig)
            }
            return
        } else {
            this.closed = true
            this.log.close()
            TOOMOSS.FreeTSFN(this.id)
        }

        // 更新设备引用计数
        const deviceInfo = TOOMOSS_CAN.deviceHandles.get(this.handle)
        if (deviceInfo) {
            deviceInfo.channels.delete(this.deviceIndex)
            deviceInfo.refCount--

            // 如果没有其他引用了，关闭设备
            if (deviceInfo.refCount <= 0) {
                TOOMOSS.USB_CloseDevice(this.handle)
                TOOMOSS_CAN.deviceHandles.delete(this.handle)
            }
        }
    }

    writeBase(id: number, msgType: CanMsgType, data: Buffer, extra?: { database?: string; name?: string }): Promise<number> {
        return new Promise((resolve, reject) => {
            const maxLen = msgType.canfd ? 64 : 8
            if (data.length > maxLen) {
                reject(new CanError(CAN_ERROR_ID.CAN_PARAM_ERROR, msgType, data))
            }

            TOOMOSS.SendCANMsg(this.handle, this.deviceIndex, this.info.canfd, {
                ID: id | (msgType.idType == CAN_ID_TYPE.EXTENDED ? 0x80000000 : 0) | (msgType.remote ? 0x40000000 : 0),
                RemoteFlag: msgType.remote ? 1 : 0,
                ExternFlag: msgType.idType == CAN_ID_TYPE.EXTENDED ? 1 : 0,
                DataLen: data.length,
                Data: data,
                DLC: data.length,
                Flags: (msgType.brs ? 0x01 : 0) | (msgType.canfd ? 0x04 : 0)
            }).then((res: any) => {
                const message: CanMessage = {
                    device: this.info.name,
                    dir: 'OUT',
                    id: id,
                    data: data,
                    ts: getTsUs() - this.startTime,
                    msgType: msgType,
                    database: extra?.database,
                    name: extra?.name
                }
                this.log.canBase(message)
                resolve(0)
            }).catch((err: any) => {
                reject(new CanError(CAN_ERROR_ID.CAN_INTERNAL_ERROR, msgType, data, err))
            })
        })


    }

    readBase(id: number, msgType: CanMsgType, timeout: number) {
        return new Promise<{ data: Buffer; ts: number }>(
            (resolve: (value: { data: Buffer; ts: number }) => void, reject: (reason: CanError) => void) => {
                const cmdId = this.getReadBaseId(id, msgType)
                const cnt = this.cnt++
                this.rejectBaseMap.set(cnt, { reject, msgType })

                this.readAbort.signal.addEventListener('abort', () => {
                    if (this.rejectBaseMap.has(cnt)) {
                        this.rejectBaseMap.delete(cnt)
                        reject(new CanError(CAN_ERROR_ID.CAN_BUS_CLOSED, msgType))
                    }
                    this.event.off(cmdId, readCb)
                })

                const readCb = (val: any) => {
                    if (this.rejectBaseMap.has(cnt)) {
                        if (val instanceof CanError) {
                            reject(val)
                        } else {
                            resolve({ data: val.data, ts: val.ts })
                        }
                        this.rejectBaseMap.delete(cnt)
                    }
                }

                this.event.once(cmdId, readCb)
            }
        )
    }

    getReadBaseId(id: number, msgType: CanMsgType): string {
        return `${id}-${msgType.canfd ? msgType.brs : false}-${msgType.remote}-${msgType.canfd}-${msgType.idType}`
    }
}
