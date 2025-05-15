import {
  CanAddr,
  CAN_ID_TYPE,
  CanMsgType,
  CAN_ERROR_ID,
  getLenByDlc,
  CanBaseInfo,
  CanDevice,
  getTsUs,
  CanMessage,
  getDlcByLen
} from '../../share/can'
import { EventEmitter } from 'events'
import { cloneDeep, set } from 'lodash'
import { addrToId, CanError } from '../../share/can'
import { CanLOG } from '../../log'
import VECTOR from './../build/Release/vector.node'
import { platform } from 'os'
import { CanBase } from '../base'

interface CANFrame {
  canId: number
  msgType: CanMsgType
  data: Buffer
  isEcho: boolean
}

interface stVectorConnection {
  AppName: string
  ChannelConfig: any
  ChannelMask: number
}

const PortHandle = new VECTOR.XLPORTHANDLE()
const PermissionMask = new VECTOR.XLACCESS()

// 设备配置结构体
const ConnectionConfigured: stVectorConnection = {
  AppName: 'EcuBus-Pro',
  ChannelConfig: {
    hwType: 0,
    hwIndex: 0,
    hwChannel: 0,
    channelBusCapabilities: 0,
    busParams: { busType: 0 },
    channelCapabilities: 0
  },
  ChannelMask: 0
}

//Map类型，对象保存键-值对，“键”-“值”，设备Map
const deviceMap = new Map<string, { device: any; channel: VECTOR_CAN[] }>()

//export导出类ZLG_CAN，extends继承类CanBase
export class VECTOR_CAN extends CanBase {
  //新建ZLG_CAN类，继承于CanBase，新建属性和方法
  event: EventEmitter //事件
  info: CanBaseInfo //CAN信息
  handle: number //句柄
  deviceIndex: number //设备索引
  index: number //设备索引
  deviceType: number //设备类型
  closed = false //关闭
  cnt = 0 //计数
  id: string //ID
  log: CanLOG //日志

  startTime = getTsUs() //启动时间
  tsOffset: number | undefined //偏移时间
  private readAbort = new AbortController() //创建一个控制器对象，用来中止一个或多个Web请求

  //待定基本命令，键-值
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

  //丢弃，键-值
  rejectBaseMap = new Map<
    number,
    {
      reject: (reason: CanError) => void
      msgType: CanMsgType
    }
  >()

  rejectMap = new Map<number, Function>() //丢弃，键-值

  //新建方法constructor
  constructor(info: CanBaseInfo) {
    super()
    this.id = info.id //当前子类使用=父类中属性
    this.info = info

    const devices = VECTOR_CAN.getValidDevices() //方法，获取设备列表

    const target = devices.find((item) => item.handle == info.handle) //获取设备列表中的句柄 == 下拉框中选择的句柄
    if (!target) {
      throw new Error('Invalid handle') //无效句柄，无效设备
    }

    this.event = new EventEmitter() //创建一个EventEmitter对象，然后使用其方法来发出和监听事件
    this.log = new CanLOG('VECTOR', info.name, this.event) //

    //'0:0' = 第几路总线：通道索引
    this.index = parseInt(info.handle.split(':')[1]) //通道索引： :0
    this.deviceType = parseInt(info.handle.split('_')[0]) //父类中设备类型：XL_HWTYPE_VN1611
    this.deviceIndex = parseInt(info.handle.split('_')[2]) //通道索引：_0
    const targetDevice = deviceMap.get(`${this.deviceType}_${this.index}`) //返回键对应的值，查找设备类型_设备索引
    let xlStatus = 0

    if (targetDevice) {
      this.handle = targetDevice.device //Map中有这个驱动 //获取索引
      targetDevice.channel.push(this) //添加到通道中
    } else {
      this.handle = 1
      // 驱动初始化
      xlStatus = VECTOR.xlOpenDriver()
      if (xlStatus !== 0) {
        throw new Error(this.getError(xlStatus))
      }

      const DrvConfig = new VECTOR.XL_DRIVER_CONFIG()
      xlStatus = VECTOR.xlGetDriverConfig(DrvConfig) //获取/打印硬件配置g_xlDrvConfig
      if (xlStatus !== 0) {
        throw new Error(this.getError(xlStatus))
      } else {
        const channles = VECTOR.CHANNEL_CONFIG.frompointer(DrvConfig.channel) //通道配置
        ConnectionConfigured.ChannelConfig = channles.getitem(this.index) //通道数组索引
      }
      deviceMap.set(`${this.deviceType}_${this.index}`, { device: this.handle, channel: [this] })
    }

    if (info.canfd) {
      if (
        //CANFD使能
        ConnectionConfigured.ChannelConfig.channelCapabilities & 0x80000000
      ) {
        //ISO
      } else if (ConnectionConfigured.ChannelConfig.channelCapabilities & 0x40000000) {
        //BOSCH
      } else {
        throw new Error('CANFD failed')
      }
    }

    // 通道掩码计算
    ConnectionConfigured.ChannelMask = VECTOR.xlGetChannelMask(
      ConnectionConfigured.ChannelConfig.hwType,
      ConnectionConfigured.ChannelConfig.hwIndex,
      ConnectionConfigured.ChannelConfig.hwChannel
    )
    // PermissionMask.value = ConnectionConfigured.ChannelMask
    // PermissionMask.value = 0

    // 总线类型处理
    if (ConnectionConfigured.ChannelConfig.busParams.busType === 1) {
      // CAN端口配置（完整条件分支）
      if (info.canfd) {
        //CANFD使能
        xlStatus = VECTOR.xlOpenPort(
          PortHandle.cast(),
          ConnectionConfigured.AppName,
          ConnectionConfigured.ChannelMask,
          PermissionMask.cast(),
          16384,
          4,
          1
        )
      } else {
        //普通CAN
        xlStatus = VECTOR.xlOpenPort(
          PortHandle.cast(),
          ConnectionConfigured.AppName,
          ConnectionConfigured.ChannelMask,
          PermissionMask.cast(),
          4096,
          3,
          1
        )
      }
      if (xlStatus !== 0) {
        VECTOR.xlClosePort(PortHandle.value())
        throw new Error(this.getError(xlStatus))
      }

      // CAN波特率配置（完整逻辑）
      if (info.canfd && info.bitratefd) {
        //CANFD使能
        const fdParams = new VECTOR.XLcanFdConf()
        fdParams.arbitrationBitRate = info.bitrate.freq //普通波特率
        fdParams.tseg1Abr = info.bitrate.timeSeg1
        fdParams.tseg2Abr = info.bitrate.timeSeg2
        fdParams.sjwAbr = info.bitrate.sjw

        fdParams.dataBitRate = info.bitratefd.freq //CANFD波特率
        fdParams.tseg1Dbr = info.bitratefd.timeSeg1
        fdParams.tseg2Dbr = info.bitratefd.timeSeg2
        fdParams.sjwDbr = info.bitratefd.sjw
        fdParams.options = 8 // 可选：启用 ISO 标准帧格式

        xlStatus = VECTOR.xlCanFdSetConfiguration(
          PortHandle.value(),
          PermissionMask.value(),
          fdParams
        )
        if (xlStatus !== 0) {
          throw new Error(this.getError(xlStatus))
        }
      } else {
        //普通CAN
        const params = new VECTOR.XLchipParams()
        params.bitRate = info.bitrate.freq
        params.sjw = info.bitrate.sjw
        params.tseg1 = info.bitrate.timeSeg1
        params.tseg2 = info.bitrate.timeSeg2
        params.sam = 1

        xlStatus = VECTOR.xlCanSetChannelParams(PortHandle.value(), PermissionMask.value(), params)
        if (xlStatus !== 0) {
          throw new Error(this.getError(xlStatus))
        }
      }

      // 通道激活（完整操作序列）
      xlStatus = VECTOR.xlDeactivateChannel(PortHandle.value(), PermissionMask.value())

      xlStatus = VECTOR.xlCanSetChannelOutput(PortHandle.value(), PermissionMask.value(), 1)
      if (xlStatus !== 0) {
        throw new Error('xlCanSetChannelOutput failed')
      }
      xlStatus = VECTOR.xlCanSetChannelMode(PortHandle.value(), PermissionMask.value(), 1, 0)
      if (xlStatus !== 0) {
        throw new Error(this.getError(xlStatus))
      }
      // xlStatus = VECTOR.xlCanSetReceiveMode(PortHandle.value(),0, 1)
      // if (xlStatus !== 0) {
      //   throw new Error('xlCanSetReceiveMode failed')
      // }
      // xlStatus = VECTOR.xlCanSetChannelTransceiver(PortHandle.value(), PermissionMask.value(), 0, 6,0)
      // if (xlStatus !== 0) {
      //   throw new Error('xlCanSetChannelTransceiver failed')
      // }
      xlStatus = VECTOR.xlActivateChannel(
        PortHandle.value(),
        ConnectionConfigured.ChannelMask,
        1,
        8
      )
      if (xlStatus !== 0) {
        throw new Error('ActivateChannel failed')
      }
      console.log('xxxxxxxxxxxxxxxxxx')
    }

    VECTOR.CreateTSFN(
      //创建线程安全函数
      PortHandle.value(), //设备句柄
      this.id,
      this.callback.bind(this) //标准CAN帧回调函数
    )
    this.attachCanMessage(this.busloadCb)
  }

  static loadDllPath(dllPath: string) {
    if (process.platform == 'win32') {
      VECTOR.LoadDll(dllPath) //加载设备DLL
    }
  }

  _read(frame: CANFrame, ts: number) {
    if (this.tsOffset == undefined) {
      this.tsOffset = ts - (getTsUs() - this.startTime)
    }
    ts = ts - this.tsOffset
    console.log('rx', frame)
    const cmdId = this.getReadBaseId(frame.canId, frame.msgType) //获取ID
    if (frame.isEcho) {
      //回传
      //tx confirm
      const items = this.pendingBaseCmds.get(cmdId)
      if (items) {
        const item = items.shift()!
        frame.msgType.uuid = item.msgType.uuid
        if (items.length == 0) {
          this.pendingBaseCmds.delete(cmdId)
        }

        const message: CanMessage = {
          device: this.info.name,
          dir: 'OUT',
          id: frame.canId,
          data: frame.data,
          ts: ts,
          msgType: frame.msgType,
          database: item.extra?.database,
          name: item.extra?.name
        }
        this.log.canBase(message)
        this.event.emit(this.getReadBaseId(frame.canId, message.msgType), message)
        item.resolve(ts)
      }
    } else {
      //非回传帧
      //rx
      const message: CanMessage = {
        device: this.info.name,
        dir: 'IN',
        id: frame.canId,
        data: frame.data,
        ts: ts,
        msgType: frame.msgType,
        database: this.info.database
      }
      this.log.canBase(message) //打印接收帧
      this.event.emit(cmdId, message) //EventEmitter触发事件，接收帧触发
    }
    // console.log('read',id.value(),dlc.value(),flag.value(),time.value())
  }

  async callback() {
    let num = 100
    if (!this.info.canfd) {
      // 普通CAN接收
      let xlStatus = 0
      const len = new VECTOR.UINT32()
      len.assign(num)
      const frames = new VECTOR.XLEVENT(num)

      xlStatus = VECTOR.xlReceive(PortHandle.value(), len, frames.cast())
      if (xlStatus === 10) {
        return
      }
      num = len.value()
      if (num > 0) {
        for (let i = 0; i < num; i++) {
          const frame = frames.getitem(i)
          const id = frame.tagData.msg.id
          const data = Buffer.alloc(frame.tagData.msg.dlc)
          const b = VECTOR.UINT8ARRAY.frompointer(frame.tagData.msg.data)
          for (let j = 0; j < frame.tagData.msg.dlc; j++) {
            data[j] = b.getitem(j)
          }

          const jsFrame: CANFrame = {
            canId: id & 0x1fffffff,
            msgType: {
              idType: id & 0x80000000 ? CAN_ID_TYPE.EXTENDED : CAN_ID_TYPE.STANDARD,
              brs: false,
              canfd: false,
              remote: id & 0x40000000 ? true : false
            },
            data: data,
            isEcho: false
          }
          this._read(jsFrame, frame.timeStamp)
          //让出时间片
          await new Promise((resolve) => {
            setImmediate(() => {
              resolve(null)
            })
          })
        }
      }
    } else {
      await this.callbackFd()
    }
  }

  async callbackFd() {
    let xlStatus = 0
    const frames = new VECTOR.XLCANRXEVENT(1)

    xlStatus = VECTOR.xlCanReceive(PortHandle.value(), frames.cast())
    if (xlStatus === 10) {
      return
    }

    //有数据

    const frame = frames.getitem(0)

    // convert to us
    const ts = frame.timeStampSync / 1000
    if (frame.tag == 0x0404 || frame.tag == 0x0400) {
      const id = frame.tagData.canRxOkMsg.canId
      const data = Buffer.alloc(frame.tagData.canRxOkMsg.dlc)
      const b = VECTOR.UINT8ARRAY.frompointer(frame.tagData.canRxOkMsg.data)
      for (let j = 0; j < data.length; j++) {
        data[j] = b.getitem(j)
      }

      const jsFrame: CANFrame = {
        canId: id & 0x1fffffff,
        msgType: {
          idType: id & 0x80000000 ? CAN_ID_TYPE.EXTENDED : CAN_ID_TYPE.STANDARD,
          brs: frame.frame.flags & 0x01 ? true : false,
          canfd: true,
          remote: id & 0x40000000 ? true : false
        },
        data: data,
        isEcho: false
      }
      this._read(jsFrame, frame.timeStamp) //读取解析后的报文
    } else if (frame.tag == 0x0401 || frame.tag == 0x0402) {
      //XL_CAN_EV_ERROR           canError;
      const error = frame.tagData.canError
      console.log('error', error.errorCode)
      let msg = ''
      switch (error.errorCode) {
        case 1:
          msg = 'XL_CAN_ERRC_BIT_ERROR'
          break
        case 2:
          msg = 'XL_CAN_ERRC_FORM_ERROR'
          break
        case 3:
          msg = 'XL_CAN_ERRC_STUFF_ERROR'
          break
        case 4:
          msg = 'XL_CAN_ERRC_OTHER_ERROR'
          break
        case 5:
          msg = 'XL_CAN_ERRC_CRC_ERROR'
          break
        case 6:
          msg = 'XL_CAN_ERRC_ACK_ERROR'
          break
        case 7:
          msg = 'XL_CAN_ERRC_NACK_ERROR'
          break
        case 8:
          msg = 'XL_CAN_ERRC_OVLD_ERROR'
          break
        case 9:
          msg = 'XL_CAN_ERRC_EXCPT_ERROR'
          break
      }

      this.log.error(ts, 'bus error ' + msg)
      this.close(true, 'bus error ' + msg)

      // //让出时间片
      // await new Promise((resolve) => {
      //   //等待下一个报文
      //   setImmediate(() => {
      //     resolve(null)
      //   })
      // })
    }
    setImmediate(() => {
      this.callbackFd()
    })
  }
  setOption(cmd: string, val: any): any {
    return this._setOption(cmd, val)
  }

  //-----------------------------------------------------------------------------------------
  //static定义类的数据成员（属性和方法）为静态的，静态成员可以直接通过类名调用
  //override重写，方法名称，参数名称，返回值类型全部相同
  static override getValidDevices(): CanDevice[] {
    //重写getValidDevices方法，返回值为CanDevice，返回可用设备的列表
    const devices: CanDevice[] = []
    if (process.platform === 'win32') {
      const deviceHandle = new VECTOR.XL_DRIVER_CONFIG()
      const ret = VECTOR.xlGetDriverConfig(deviceHandle) //获取/打印硬件配置g_xlDrvConfig
      if (ret === 0) {
        const channles = VECTOR.CHANNEL_CONFIG.frompointer(deviceHandle.channel) //通道配置
        for (let num = 0; num < deviceHandle.channelCount; num++) {
          //设备通道循环索引
          const channel = channles.getitem(num) //通道数组索引
          const channelName = channel.name.replace(/\0/g, '') //通道名称
          let busType = ''

          if (channel.transceiverName.indexOf('LIN') !== -1) {
            // busType = '#LIN' //总线类型
            continue
          } else if (channel.name.indexOf('Virtual') !== -1) {
            busType = ''
          } else {
            busType = '#CAN'
          }

          devices.push({
            label: `${channelName}${busType}`, //'VN1640A Channel 1#LIN' = 通道名称#总线类型
            id: `VECTOR_${num}_${busType}`, //'VECTOR_0_#LIN' = 通道索引_#总线类型
            //hwType channelBusCapabilities hwIndex hwChannel
            handle: `${channel.hwChannel}:${num}` //'0:0' = 第几路总线：通道索引
          })
        }
      }
    }
    return devices
  }

  //-----------------------------------------------------------------------------------------
  static override getLibVersion(): string {
    //库版本信息
    if (process.platform == 'win32') {
      return '11.0.14.00'
    }
    return 'only support windows'
  }

  close(isReset = false, msg?: string) {
    //关闭设备
    // clearInterval(this.timer)

    this.readAbort.abort() //中止Web请求

    for (const [key, value] of this.rejectBaseMap) {
      //
      value.reject(new CanError(CAN_ERROR_ID.CAN_BUS_CLOSED, value.msgType, undefined, msg))
    }
    this.rejectBaseMap.clear() //移除 Map 对象的所有键/值对

    //pendingBaseCmds
    for (const [key, vals] of this.pendingBaseCmds) {
      for (const val of vals) {
        val.reject(new CanError(CAN_ERROR_ID.CAN_BUS_CLOSED, val.msgType, undefined, msg))
      }
    }
    this.pendingBaseCmds.clear()

    if (isReset) {
      //开启复位
      // VECTOR.ZCAN_ResetCAN(this.channel)                         //复位设备
      // VECTOR.ZCAN_StartCAN(this.channel)
      //this._close(CAN_ERROR_ID.CAN_BUS_CLOSED, msg)
      VECTOR.xlDeactivateChannel(PortHandle.value(), PermissionMask.value())
      //active
      VECTOR.xlActivateChannel(PortHandle.value(), ConnectionConfigured.ChannelMask, 1, 0)
    } else {
      //不复位
      this.closed = true
      this.log.close()
      let xlStatus = 0
      xlStatus = VECTOR.xlDeactivateChannel(PortHandle.value(), ConnectionConfigured.ChannelMask) //所选的通道退出总线。如果没有其他情况，通道将被禁用激活通道的端口。
      xlStatus = VECTOR.xlClosePort(PortHandle.value()) //这个函数关闭一个端口并禁用它的通道
      const target = deviceMap.get(`${this.deviceType}_${this.index}`)
      if (target) {
        //获取
        //remove this channel

        target.channel = target.channel.filter((item) => item != this)
        if (target.channel.length == 0) {
          //close device

          xlStatus = VECTOR.xlCloseDriver() //关闭驱动程序
          if (xlStatus !== 0) {
            // throw new Error('xlCanTransmit failed')
          }

          deviceMap.delete(`${this.deviceType}_${this.index}`) //删除
        }
      }
      VECTOR.FreeTSFN(this.id) //释放
      this._close()
    }
  }

  writeBase(
    //发送报文
    id: number,
    msgType: CanMsgType,
    data: Buffer,
    extra?: { database?: string; name?: string }
  ) {
    let maxLen = msgType.canfd ? 64 : 8 //最大长度
    if (data.length > maxLen) {
      throw new CanError(CAN_ERROR_ID.CAN_PARAM_ERROR, msgType, data)
    }

    if (msgType.canfd) {
      //CANFD帧
      //detect data.length range by dlc
      if (data.length > 8 && data.length <= 12) {
        maxLen = 12
      } else if (data.length > 12 && data.length <= 16) {
        maxLen = 16
      } else if (data.length > 16 && data.length <= 20) {
        maxLen = 20
      } else if (data.length > 20 && data.length <= 24) {
        maxLen = 24
      } else if (data.length > 24 && data.length <= 32) {
        maxLen = 32
      } else if (data.length > 32 && data.length <= 48) {
        maxLen = 48
      } else if (data.length > 48) {
        maxLen = 64
      } else {
        maxLen = data.length
      }
      data = Buffer.concat([data, Buffer.alloc(maxLen - data.length).fill(0)]) //合并数据和填充数据0
    }

    const cmdId = this.getReadBaseId(id, msgType)
    //queue
    return this._writeBase(id, msgType, cmdId, data, extra) //发送函数
  }

  _writeBase(
    //发送函数
    id: number,
    msgType: CanMsgType,
    cmdId: string,
    data: Buffer,
    extra?: { database?: string; name?: string }
  ) {
    return new Promise<number>(
      (resolve: (value: number) => void, reject: (reason: CanError) => void) => {
        const item = this.pendingBaseCmds.get(cmdId)
        if (item) {
          item.push({ resolve, reject, data, msgType, extra })
        } else {
          this.pendingBaseCmds.set(cmdId, [{ resolve, reject, data, msgType, extra }])
        }
        if (this.info.canfd) {
          //CANFD使能
          let rid = id
          if (msgType.idType == CAN_ID_TYPE.EXTENDED) {
            rid += 0x80000000
          }
          let flag = 0
          if (msgType.remote) {
            flag |= 0x0010
          }
          if (msgType.canfd) {
            flag |= 0x0001
            if (msgType.brs) {
              flag |= 0x0002
            }
          }
          console.log('flag', flag)

          const canTxEvt = new VECTOR.XLcanTxEvent()
          canTxEvt.tag = 0x0440
          canTxEvt.transId = 0xffff
          canTxEvt.tagData.canMsg.canId = rid
          canTxEvt.tagData.canMsg.msgFlags = flag
          canTxEvt.tagData.canMsg.dlc = getDlcByLen(data.length, true)
          console.log(canTxEvt.tagData.canMsg.dlc)
          const dataPtr = VECTOR.UINT8ARRAY.frompointer(canTxEvt.tagData.canMsg.data)
          for (let i = 0; i < data.length; i++) {
            dataPtr.setitem(i, data[i])
          }

          let xlStatus = 0
          const messageCount = 1
          const cntSent = new VECTOR.UINT32()
          cntSent.assign(1)
          xlStatus = VECTOR.xlCanTransmitEx(
            PortHandle.value(),
            ConnectionConfigured.ChannelMask,
            messageCount,
            cntSent.cast(),
            canTxEvt
          )

          if (xlStatus != 0) {
            this.pendingBaseCmds.get(cmdId)?.pop()
            const err = this.getError(xlStatus)
            // this.close(true)
            reject(new CanError(CAN_ERROR_ID.CAN_INTERNAL_ERROR, msgType, data, err))
            // this.log.error((getTsUs() - this.startTime),'bus error')
          }
        } else {
          //普通CAN
          let rid = id
          let flag = 0
          if (msgType.idType == CAN_ID_TYPE.EXTENDED) {
            rid += 0x80000000
          }
          if (msgType.remote) {
            flag |= 0x0010
          }

          const framedata = new VECTOR.s_xl_event()
          framedata.tag = 10
          framedata.tagData.msg.id = rid
          framedata.tagData.msg.dlc = getDlcByLen(data.length, false)
          framedata.tagData.msg.flags = flag
          const dataPtr = VECTOR.UINT8ARRAY.frompointer(framedata.tagData.msg.data)
          for (let i = 0; i < data.length; i++) {
            dataPtr.setitem(i, data[i])
          }

          const cntSent = new VECTOR.UINT32()
          cntSent.assign(1)
          const xlStatus = VECTOR.xlCanTransmit(
            PortHandle.value(),
            ConnectionConfigured.ChannelMask,
            cntSent.cast(),
            framedata
          )

          if (xlStatus !== 0) {
            //发送错误
            this.pendingBaseCmds.get(cmdId)?.pop()
            const msg = this.getError(xlStatus)
            reject(new CanError(CAN_ERROR_ID.CAN_INTERNAL_ERROR, msgType, data, msg))
            // this.close(true)
            // this.log.error((getTsUs() - this.startTime),'bus error')
          }
        }
      }
    )
  }

  getError(err: number) {
    //获取错误
    const msg = VECTOR.JSxlGetErrorString(err)

    return msg
  }
  getReadBaseId(id: number, msgType: CanMsgType): string {
    return `${id}-${msgType.canfd ? msgType.brs : false}-${msgType.remote}-${msgType.canfd}-${msgType.idType}`
  }

  readBase(id: number, msgType: CanMsgType, timeout: number) {
    //读取，不改变
    return new Promise<{ data: Buffer; ts: number }>(
      (
        resolve: (value: { data: Buffer; ts: number }) => void,
        reject: (reason: CanError) => void
      ) => {
        const cmdId = this.getReadBaseId(id, msgType)
        const cnt = this.cnt
        this.cnt++
        this.rejectBaseMap.set(cnt, { reject, msgType })

        this.readAbort.signal.addEventListener('abort', () => {
          if (this.rejectBaseMap.has(cnt)) {
            this.rejectBaseMap.delete(cnt)
            reject(new CanError(CAN_ERROR_ID.CAN_BUS_CLOSED, msgType))
          }
          this.event.off(cmdId, readCb)
        })

        const readCb = (val: any) => {
          // clearTimeout(timer)
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
}
