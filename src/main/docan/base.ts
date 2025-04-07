import EventEmitter from 'events'
import {
  addrToStr,
  CAN_ERROR_ID,
  CanAddr,
  CanBaseInfo,
  CanBitrate,
  CanDevice,
  CanError,
  CanMessage,
  CanMsgType
} from '../share/can'
import { CanLOG } from '../log'

export abstract class CanBase {
  enableTesterPresent: Record<
    string,
    {
      addr: CanAddr
      timeout: number
      timer?: NodeJS.Timeout
      action: () => Promise<void>
    }
  > = {}
  abstract info: CanBaseInfo
  abstract log: CanLOG
  abstract close(): void
  // abstract log: CanLOG
  abstract readBase(
    id: number,
    msgType: CanMsgType,
    timeout: number
  ): Promise<{ data: Buffer; ts: number }>
  abstract writeBase(
    id: number,
    msgType: CanMsgType,
    data: Buffer,
    extra?: { database?: string; name?: string }
  ): Promise<number>
  abstract getReadBaseId(id: number, msgType: CanMsgType): string
  abstract setOption(cmd: string, val: any): any

  abstract event: EventEmitter
  static getValidDevices(): CanDevice[] {
    throw new Error('Method not implemented.')
  }
  static getLibVersion(): string {
    throw new Error('Method not implemented.')
  }
  static getDefaultBitrate(canfd: boolean): CanBitrate[] {
    return []
  }
  attachCanMessage(cb: (msg: CanMessage) => void) {
    this.event.on('can-frame', cb)
  }
  detachCanMessage(cb: (msg: CanMessage) => void) {
    this.event.off('can-frame', cb)
  }
  protected _close() {
    Object.values(this.enableTesterPresent).forEach((e) => {
      clearTimeout(e.timer)
    })
  }
  protected _setOption(cmd: string, val: any): any {
    if (cmd == 'testerPresent') {
      const id = addrToStr(val.addr)
      const present = this.enableTesterPresent[id]
      clearTimeout(present?.timer)
      this.enableTesterPresent[id] = val
    } else if (cmd == 'startTesterPresent') {
      const id = addrToStr(val.canAddr)
      const present = this.enableTesterPresent[id]
      if (present) {
        clearTimeout(present.timer)
        present.timer = setTimeout(() => {
          if (present) {
            present.action().finally(() => {
              this._setOption('startTesterPresent', val)
            })
          }
        }, present.timeout)
      }
    } else if (cmd == 'stopTesterPresent') {
      const id = addrToStr(val.canAddr)
      const present = this.enableTesterPresent[id]
      if (present) {
        clearTimeout(present.timer)
        present.timer = undefined
      }
    } else if (cmd == 'getTesterPresent') {
      if (val) {
        const id = addrToStr(val)
        return this.enableTesterPresent[id]
      } else {
        return this.enableTesterPresent
      }
    }
  }
}

export class CAN_SOCKET {
  inst: CanBase
  msgType: CanMsgType
  closed = false
  id: number
  recvId: string
  tsOffset: number | null = null
  recvBuffer: ({ data: Buffer; ts: number } | CanError)[] = []
  recvTimer: NodeJS.Timeout | null = null
  cb: any
  pendingRecv: {
    resolve: (value: { data: Buffer; ts: number }) => void
    reject: (reason: CanError) => void
  } | null = null
  constructor(
    inst: CanBase,
    id: number,
    msgType: CanMsgType,
    private extra?: { database?: string; name?: string }
  ) {
    this.inst = inst
    this.msgType = msgType
    this.id = id
    this.recvId = this.inst.getReadBaseId(id, msgType)
    this.cb = this.recvHandle.bind(this)
    this.inst.event.on(this.recvId, this.cb)
  }
  getSystemTs() {
    const hrTime = process.hrtime()
    return hrTime[0] * 1000000 + Math.floor(hrTime[1] / 1000)
  }
  recvHandle(val: { data: Buffer; ts: number } | CanError) {
    // if(!(val instanceof CanError)){
    //   const ts=val.ts
    //   const systemTs=this.getSystemTs()
    //   if(this.tsOffset==null){
    //     this.tsOffset=systemTs-ts
    //   }else{
    //     //average
    //     this.tsOffset=Math.floor((this.tsOffset+(systemTs-ts))/2)
    //   }
    // }
    if (this.pendingRecv) {
      if (this.recvTimer) {
        clearTimeout(this.recvTimer)
        this.recvTimer = null
      }
      if (val instanceof CanError) {
        this.pendingRecv.reject(val)
      } else {
        this.pendingRecv.resolve(val)
      }
      this.pendingRecv = null
    } else {
      this.recvBuffer.push(val)
    }
  }
  error(id: CAN_ERROR_ID) {
    return new CanError(id, this.msgType)
  }
  async read(timeout: number): Promise<{ data: Buffer; ts: number }> {
    return new Promise((resolve, reject) => {
      if (this.closed) {
        reject(this.error(CAN_ERROR_ID.CAN_BUS_CLOSED))
        return
      }
      const val = this.recvBuffer.shift()
      if (val) {
        if (val instanceof CanError) {
          reject(val)
        } else {
          resolve(val)
        }
      } else {
        this.pendingRecv = { resolve, reject }
        this.recvTimer = setTimeout(() => {
          if (this.pendingRecv) {
            reject(this.error(CAN_ERROR_ID.CAN_READ_TIMEOUT))
            this.pendingRecv = null
          }
        }, timeout)
      }
    })
  }
  async write(data: Buffer): Promise<number> {
    if (this.closed) {
      throw this.error(CAN_ERROR_ID.CAN_BUS_CLOSED)
    }
    if (this.msgType.canfd) {
      if (this.inst.info.canfd == false) {
        throw this.error(CAN_ERROR_ID.CAN_PARAM_ERROR)
      }
    }
    const ts = await this.inst.writeBase(this.id, this.msgType, data, this.extra)
    // const systemTs=this.getSystemTs()
    // if(this.tsOffset==null){
    //   this.tsOffset=systemTs-ts
    // }else{
    //   //average
    //   this.tsOffset=Math.floor((this.tsOffset+(systemTs-ts))/2)
    // }
    return ts
  }
  close() {
    if (this.pendingRecv) {
      this.pendingRecv.reject(this.error(CAN_ERROR_ID.CAN_BUS_CLOSED))
      this.pendingRecv = null
    }
    this.inst.event.off(this.recvId, this.cb)
    this.closed = true
  }
}
