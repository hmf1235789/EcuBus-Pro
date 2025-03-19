import {
  getPID,
  LIN_ERROR_ID,
  LIN_SCH_TYPE,
  LinBaseInfo,
  LinChecksumType,
  LinDevice,
  LinDirection,
  LinError,
  LinMode,
  LinMsg
} from '../../share/lin'
import LIN from '../build/Release/toomossLin.node'
import { v4 } from 'uuid'
import { queue, QueueObject } from 'async'
import { LinLOG } from 'src/main/log'
import EventEmitter from 'events'
import LinBase, { LinWriteOpt, QueueItem } from '../base'
import { getTsUs } from 'src/main/share/can'
import { LDF } from 'src/renderer/src/database/ldfParse'

let txCnt = 0
export class ToomossLin extends LinBase {
  // 添加静态设备管理Map

  queue = queue((task: QueueItem, cb) => {
    if (task.discard) {
      cb()
    } else {
      this._write(task.data).then(task.resolve).catch(task.reject).finally(cb)
    }
  }, 1)

  private lastFrame: Map<number, LinMsg> = new Map()
  event = new EventEmitter()
  pendingPromise?: {
    resolve: (msg: LinMsg) => void
    reject: (error: LinError) => void
    sendMsg: LinMsg
  }
  static loadDllPath(dllPath: string) {
    if (process.platform == 'win32') {
      LIN.LoadDll(dllPath)
    }
  }
  static getLibVersion() {
    if (process.platform == 'win32') {
      return '1.8.6.0'
    } else {
      return 'only support windows'
    }
  }
  startTs: number
  offsetTs = 0
  offsetInit = false
  log: LinLOG
  db?: LDF

  handle: number
  channel: number = 0
  deviceIndex: number
  constructor(public info: LinBaseInfo) {
    super(info)

    this.log = new LinLOG('PEAK', info.name, this.event)
    this.startTs = getTsUs()
    this.handle = parseInt(info.device.handle.split(':')[0])
    this.deviceIndex = parseInt(info.device.handle.split(':')[1])
    let ret = 0

    if (global.toomossDeviceHandles == undefined) {
      global.toomossDeviceHandles = new Map<
        number,
        {
          refCount: number // 引用计数
          channels: Set<number> // 当前使用的通道
        }
      >()
    }
    let deviceInfo = global.toomossDeviceHandles.get(this.handle)
    if (!deviceInfo) {
      // 首次打开设备
      ret = LIN.USB_OpenDevice(this.handle)
      if (ret != 1) {
        throw new Error('Open device failed')
      }
      deviceInfo = {
        refCount: 1,
        channels: new Set([this.deviceIndex])
      }
      global.toomossDeviceHandles.set(this.handle, deviceInfo)
    } else {
      // 设备已打开，检查通道是否已被使用
      if (deviceInfo.channels.has(this.deviceIndex)) {
        throw new Error(`Channel ${this.deviceIndex} is already in use`)
      }
      deviceInfo.refCount++
      deviceInfo.channels.add(this.deviceIndex)
    }
    LIN.DEV_ResetTimestamp(this.handle)

    if (info.database) {
      this.db = global.database.lin[info.database]
    }
    for (let i = 0; i <= 0x3f; i++) {
      const checksum = i == 0x3c || i == 0x3d ? LinChecksumType.CLASSIC : LinChecksumType.ENHANCED
      this.setEntry(i, 8, LinDirection.RECV_AUTO_LEN, checksum, Buffer.alloc(8), 0)
    }
    ret = LIN.LIN_EX_Init(
      this.handle,
      this.deviceIndex,
      info.baudRate,
      info.mode == LinMode.MASTER ? 1 : 0
    )
    if (ret != 0) {
      throw new LinError(LIN_ERROR_ID.LIN_PARAM_ERROR, undefined, 'init failed')
    }
    LIN.LIN_EX_CtrlPowerOut(this.handle, this.deviceIndex, 0)
    LIN.CreateTSFN(
      this.handle,
      this.deviceIndex,
      LinMode.MASTER ? true : false,
      this.info.id,
      this.callback.bind(this)
    )
    // this.getEntrys()
    // this.wakeup()
  }
  setEntry(
    frameId: number,
    length: number,
    dir: LinDirection,
    checksumType: LinChecksumType,
    initData: Buffer,
    flag: number
  ) {
    // const entry = new LIN.TLINFrameEntry()
    // entry.FrameId = frameId
    // entry.Length = length
    // entry.Direction = dir == LinDirection.SEND ? 1 : dir == LinDirection.RECV ? 2 : 3
    // entry.ChecksumType = checksumType == LinChecksumType.CLASSIC ? 1 : 2
    // entry.Flags = flag
    // const ia = LIN.ByteArray.frompointer(entry.InitialData)
    // for (let i = 0; i < length; i++) {
    //   ia.setitem(i, initData[i])
    // }
    // const result = LIN.LIN_SetFrameEntry(this.client, this.info.device.handle, entry)
    // if (result != 0) {
    //   throw new LinError(LIN_ERROR_ID.LIN_PARAM_ERROR, undefined, err2Str(result))
    // }
  }
  async callback(msg: {
    id: number
    result: number
    linMsg: {
      MsgType: number
      CheckType: number
      PID: number
      Check: number
      BreakBits: number
      Data: Buffer
    }
  }) {
    console.log(msg)
    // if (ret == 0) {
    //   let ts = recvMsg.TimeStamp
    //   if (!this.offsetInit) {
    //     this.offsetTs = ts - (getTsUs() - this.startTs)
    //     this.offsetInit = true
    //   }
    //   ts -= this.offsetTs

    //   if (recvMsg.Type == 0) {
    //     //mstStandard
    //     const a = new LIN.ByteArray.frompointer(recvMsg.Data)
    //     const data = Buffer.alloc(recvMsg.Length)
    //     for (let i = 0; i < recvMsg.Length; i++) {
    //       data[i] = a.getitem(i)
    //     }

    //     const msg: LinMsg = {
    //       frameId: recvMsg.FrameId & 0x3f,
    //       data: data,
    //       direction:
    //         recvMsg.Direction == 1
    //           ? LinDirection.SEND
    //           : recvMsg.Direction == 2
    //             ? LinDirection.RECV
    //             : LinDirection.RECV_AUTO_LEN,
    //       checksumType:
    //         recvMsg.ChecksumType == 1 ? LinChecksumType.CLASSIC : LinChecksumType.ENHANCED,
    //       checksum: recvMsg.Checksum
    //     }

    //     if (recvMsg.ErrorFlags == 0) {
    //       this.lastFrame.set(msg.frameId, msg)
    //     }
    //     const error: string[] = []
    //     const handle = () => {
    //       if (recvMsg.ErrorFlags & 1) {
    //         error.push('Error on Synchronization field')
    //       }
    //       if (recvMsg.ErrorFlags & 2) {
    //         error.push('Wrong parity Bit 0')
    //       }
    //       if (recvMsg.ErrorFlags & 4) {
    //         error.push('Wrong parity Bit 1')
    //       }
    //       if (recvMsg.ErrorFlags & 8) {
    //         error.push('Slave not responding error')
    //       }
    //       if (recvMsg.ErrorFlags & 16) {
    //         error.push('A timeout was reached')
    //       }
    //       if (recvMsg.ErrorFlags & 32) {
    //         error.push('Wrong checksum')
    //       }
    //       if (recvMsg.ErrorFlags & 64) {
    //         error.push('Bus shorted to ground')
    //       }
    //       if (recvMsg.ErrorFlags & 128) {
    //         error.push('Bus shorted to Vbat')
    //       }
    //       if (recvMsg.ErrorFlags & 256) {
    //         error.push('A slot time (delay) was too smallt')
    //       }
    //       if (recvMsg.ErrorFlags & 512) {
    //         error.push(' Response was received from other station')
    //       }
    //     }
    //     let isEvent = false
    //     if (this.pendingPromise && this.pendingPromise.sendMsg.frameId == (msg.frameId & 0x3f)) {
    //       this.pendingPromise.sendMsg.data = msg.data
    //       this.pendingPromise.sendMsg.ts = ts
    //       if (recvMsg.ErrorFlags != 0) {
    //         handle()
    //         this.log.error(ts, error.join(', '), this.pendingPromise.sendMsg)
    //         this.pendingPromise.reject(
    //           new LinError(
    //             LIN_ERROR_ID.LIN_BUS_ERROR,
    //             this.pendingPromise.sendMsg,
    //             error.join(', ')
    //           )
    //         )
    //       } else {
    //         this.log.linBase(this.pendingPromise.sendMsg)
    //         this.event.emit(`${msg.frameId}`, this.pendingPromise.sendMsg)
    //         this.pendingPromise.resolve(this.pendingPromise.sendMsg)
    //       }
    //       this.pendingPromise = undefined
    //     } else {
    //       //slave
    //       msg.ts = ts
    //       if (this.db) {
    //         // Find matching frame or event frame
    //         let frameName: string | undefined

    //         let publish: string | undefined

    //         // Check regular frames
    //         for (const fname in this.db.frames) {
    //           if (this.db.frames[fname].id === msg.frameId) {
    //             frameName = fname
    //             publish = this.db.frames[fname].publishedBy
    //             break
    //           }
    //         }

    //         // Check event triggered frames
    //         if (!frameName) {
    //           for (const ename in this.db.eventTriggeredFrames) {
    //             const eventFrame = this.db.eventTriggeredFrames[ename]
    //             if (eventFrame.frameId === msg.frameId) {
    //               frameName = ename
    //               isEvent = true
    //               break
    //             }
    //           }
    //         }

    //         // Enrich message with database info if frame found
    //         if (frameName) {
    //           msg.name = frameName
    //           msg.workNode = publish
    //           msg.isEvent = isEvent
    //         }
    //       }
    //       if (recvMsg.ErrorFlags != 0) {
    //         handle()
    //         this.log.error(ts, error.join(', '), msg)
    //       } else {
    //         if (isEvent && this.db) {
    //           const pid = msg.data[0] & 0x3f
    //           for (const fname in this.db.frames) {
    //             if (this.db.frames[fname].id === pid) {
    //               msg.workNode = this.db.frames[fname].publishedBy
    //               break
    //             }
    //           }
    //         }
    //         this.log.linBase(msg)
    //         this.event.emit(`${msg.frameId}`, msg)
    //       }
    //     }
    //   } else if (recvMsg.Type == 1) {
    //     this.log.sendEvent('busSleep', ts)
    //   } else if (recvMsg.Type == 2) {
    //     this.log.sendEvent('busWakeUp', ts)
    //   } else {
    //     this.log.error(ts, 'internal error')
    //   }
    //   //让出时间片
    //   await new Promise((resolve) => {
    //     setImmediate(() => {
    //       resolve(null)
    //     })
    //   })
    //   await this.callback()
    // }
  }
  close() {
    LIN.FreeTSFN(this.info.id)
    LIN.LIN_EX_Stop(this.handle, this.deviceIndex)
    const deviceInfo = global.toomossDeviceHandles?.get(this.handle)
    if (deviceInfo) {
      deviceInfo.channels.delete(this.deviceIndex)
      deviceInfo.refCount--

      // 如果没有其他引用了，关闭设备
      if (deviceInfo.refCount <= 0) {
        LIN.USB_CloseDevice(this.handle)
        global.toomossDeviceHandles?.delete(this.handle)
      }
    }
  }
  async _write(m: LinMsg): Promise<number> {
    return new Promise<number>((resolve, reject) => {
      const cmdId = txCnt++
      const msg: any = {}
      msg.PID = getPID(m.frameId)
      msg.BreakBits = 13
      msg.CheckType = m.checksumType == LinChecksumType.CLASSIC ? 0 : 1
      msg.Data = m.data
      msg.Check = 0

      if (this.info.mode == LinMode.MASTER) {
        if (this.pendingPromise != undefined) {
          reject(new LinError(LIN_ERROR_ID.LIN_BUS_BUSY, m))
          return
        }
        if (m.direction == LinDirection.SEND) {
          msg.MsgType = 1
        } else {
          msg.MsgType = 2
        }
        LIN.SendLinMsg(this.handle, this.deviceIndex, cmdId, this.info.id, msg)
        this.pendingPromise = {
          resolve: (msg) => resolve(msg.ts || 0),
          reject,
          sendMsg: m
        }
      } else {
        reject(new LinError(LIN_ERROR_ID.LIN_INTERNAL_ERROR, undefined, 'not supported'))
      }
    })
  }

  read(frameId: number) {
    return this.lastFrame.get(frameId)
  }
  wakeup() {
    throw new LinError(LIN_ERROR_ID.LIN_INTERNAL_ERROR, undefined, 'not supported')
  }

  static getValidDevices(): LinDevice[] {
    const devices: LinDevice[] = []
    if (process.platform !== 'win32') {
      const deviceHandle = new LIN.I32Array(10)
      const ret = LIN.USB_ScanDevice(deviceHandle)
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
}
