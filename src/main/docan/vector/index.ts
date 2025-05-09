import {
  CanAddr,
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

const gDeviceParameters = {
  tool: '',
  ch: '',
  index: 0,
  CANFD: false,
  CANOnCANFD: false,
  br: 0,
  type: 0,
  req_phy_id: 0,
  resp_id: 0
}

interface stVectorConnection {
  RxThreadRun: boolean
  AppName: string
  PortHandle: number
  DrvConfig: any
  ChannelConfig: any
  ChannelMask: number
  PermissionMask: number
  HandleMsgEvent: number
  LinStatPar: any
  Checksum: number
}

// 设备配置结构体
const ConnectionConfigured: stVectorConnection = {
  RxThreadRun: false,
  AppName: 'xlCANdemo'.padEnd(VECTOR.XL_MAX_APPNAME + 1, '\0'),
  PortHandle: VECTOR.XL_INVALID_PORTHANDLE,
  DrvConfig: {
    channelCount: 0,
    channel: []
  },
  ChannelConfig: {
    hwType: 0,
    hwIndex: 0,
    hwChannel: 0,
    channelBusCapabilities: 0,
    busParams: { busType: 0 },
    channelCapabilities: 0
  },
  ChannelMask: 0,
  PermissionMask: 0,
  HandleMsgEvent: 0,
  LinStatPar: {
    baudrate: 0,
    LINMode: 0,
    LINVersion: 0
  },
  Checksum: 0
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
  canMiniBug = false
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
    console.log(devices)
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

    let xlStatus: any //Map没有这个驱动
    let m_Vectordevtype = VECTOR.XL_HWTYPE_VN1611
    let m_Vectorbustype = VECTOR.XL_BUS_TYPE_CAN
    let m_VectorChannel = 0
    // 设备类型判断（完整分支）
    m_Vectordevtype = this.deviceType
    m_Vectorbustype = VECTOR.XL_BUS_TYPE_CAN
    m_VectorChannel = this.deviceIndex

    const PortHandle = new VECTOR.XLPORTHANDLE()

    if (targetDevice) {
      this.handle = targetDevice.device //Map中有这个驱动 //获取索引
      targetDevice.channel.push(this) //添加到通道中
    } else {
      this.handle = 1
      // 驱动初始化
      xlStatus = VECTOR.xlOpenDriver()
      if (xlStatus !== VECTOR.XL_SUCCESS) {
        throw new Error('OpenDriver failed')
      }

      const DrvConfig = new VECTOR.XL_DRIVER_CONFIG()
      xlStatus = VECTOR.xlGetDriverConfig(DrvConfig) //获取/打印硬件配置g_xlDrvConfig
      if (xlStatus !== VECTOR.XL_SUCCESS) {
        throw new Error('GetDriverConfig failed')
      } else {
        console.log('valid channle count', DrvConfig.channelCount)
        const channles = VECTOR.CHANNEL_CONFIG.frompointer(DrvConfig.channel) //通道配置
        ConnectionConfigured.ChannelConfig = channles.getitem(this.index) //通道数组索引
      }
    }

    // 通道掩码计算
    ConnectionConfigured.ChannelMask = VECTOR.xlGetChannelMask(
      ConnectionConfigured.ChannelConfig.hwType,
      ConnectionConfigured.ChannelConfig.hwIndex,
      ConnectionConfigured.ChannelConfig.hwChannel
    )
    const PermissionMask = new VECTOR.XLACCESS()
    // PermissionMask.value = 0

    // 总线类型处理
    if (ConnectionConfigured.ChannelConfig.busParams.busType === VECTOR.XL_BUS_TYPE_CAN) {
      // CAN端口配置（完整条件分支）
      if (info.canfd) {
        //CANFD使能
        xlStatus = VECTOR.xlOpenPort(
          PortHandle.cast(),
          ConnectionConfigured.AppName,
          ConnectionConfigured.ChannelMask,
          PermissionMask.cast(),
          16384,
          VECTOR.XL_INTERFACE_VERSION_V4,
          VECTOR.XL_BUS_TYPE_CAN
        )
      } else {
        //普通CAN
        xlStatus = VECTOR.xlOpenPort(
          PortHandle.cast(),
          ConnectionConfigured.AppName,
          ConnectionConfigured.ChannelMask,
          PermissionMask.cast(),
          4096,
          VECTOR.XL_INTERFACE_VERSION,
          VECTOR.XL_BUS_TYPE_CAN
        )
      }
      if (xlStatus !== VECTOR.XL_SUCCESS) {
        VECTOR.xlClosePort(PortHandle.cast())
        ConnectionConfigured.PortHandle = VECTOR.XL_INVALID_PORTHANDLE
        throw new Error('OpenPort failed')
      }

      // CAN波特率配置（完整逻辑）
      if (info.canfd && info.bitratefd) {
        //CANFD使能
        const fdParams = new VECTOR.XLcanFdConf()
        ;(fdParams.arbitrationBitRate = info.bitrate.freq), //普通波特率
          (fdParams.tseg1Abr = 6),
          (fdParams.tseg2Abr = 3),
          (fdParams.sjwAbr = 2),
          (fdParams.dataBitRate = info.bitratefd.freq), //CANFD波特率
          (fdParams.tseg1Dbr = 6),
          (fdParams.tseg2Dbr = 3),
          (fdParams.sjwDbr = 2)

        xlStatus = VECTOR.xlCanFdSetConfiguration(
          PortHandle.value(),
          PermissionMask.value(),
          fdParams
        )
      } else {
        //普通CAN
        xlStatus = VECTOR.xlCanSetChannelBitrate(
          PortHandle.value(),
          PermissionMask.value(),
          info.bitrate.freq //普通波特率
        )
      }
      if (xlStatus !== VECTOR.XL_SUCCESS) {
        throw new Error('CanSetChannelBitrate failed')
      }

      // 通道激活（完整操作序列）
      xlStatus = VECTOR.xlDeactivateChannel(PortHandle.value(), PermissionMask.value())
      xlStatus = VECTOR.xlCanSetChannelOutput(
        PortHandle.value(),
        PermissionMask.value(),
        VECTOR.XL_OUTPUT_MODE_NORMAL
      )
      xlStatus = VECTOR.xlActivateChannel(
        PortHandle.value(),
        ConnectionConfigured.ChannelMask,
        VECTOR.XL_BUS_TYPE_CAN,
        VECTOR.XL_ACTIVATE_RESET_CLOCK
      )
      if (xlStatus !== VECTOR.XL_SUCCESS) {
        throw new Error('ActivateChannel failed')
      }
    } else if (ConnectionConfigured.ChannelConfig.busParams.busType === VECTOR.XL_BUS_TYPE_LIN) {
      // LIN配置（完整逻辑）
      xlStatus = VECTOR.xlOpenPort(
        PortHandle.cast(),
        ConnectionConfigured.AppName,
        ConnectionConfigured.ChannelMask,
        PermissionMask.cast(),
        VECTOR.RX_QUEUE_SIZE_LIN,
        VECTOR.XL_INTERFACE_VERSION,
        VECTOR.XL_BUS_TYPE_LIN
      )
      if (xlStatus !== VECTOR.XL_SUCCESS) {
        throw new Error('OpenPort failed')
      }

      // ConnectionConfigured.Checksum =
      //   gDeviceParameters.type === 0
      //     ? VECTOR.XL_LIN_CALC_CHECKSUM
      //     : VECTOR.XL_LIN_CALC_CHECKSUM_ENHANCED
      ConnectionConfigured.Checksum == VECTOR.XL_LIN_CALC_CHECKSUM

      ConnectionConfigured.LinStatPar = {
        baudrate: info.bitrate.freq, //LIN波特率
        LINMode: VECTOR.XL_LIN_MASTER,
        LINVersion: VECTOR.XL_LIN_VERSION_2_1
      }
      xlStatus = VECTOR.xlLinSetChannelParams(
        PortHandle.cast(),
        ConnectionConfigured.ChannelMask,
        ConnectionConfigured.LinStatPar
      )

      const dlc = new Array(64).fill(8)
      xlStatus = VECTOR.xlLinSetDLC(PortHandle.cast(), ConnectionConfigured.ChannelMask, dlc)

      const data = new Array(8).fill(0)
      xlStatus = VECTOR.xlLinSetSlave(
        PortHandle.cast(),
        ConnectionConfigured.ChannelMask,
        0x3c,
        data,
        8,
        ConnectionConfigured.Checksum
      )

      xlStatus = VECTOR.xlActivateChannel(
        PortHandle.cast(),
        ConnectionConfigured.ChannelMask,
        VECTOR.XL_BUS_TYPE_LIN,
        1
      )
      xlStatus = VECTOR.xlFlushReceiveQueue(PortHandle.cast())
    }

    //测试发送逻辑
    if (ConnectionConfigured.ChannelConfig.busParams.busType === VECTOR.XL_BUS_TYPE_CAN) {
      // CAN测试发送（完整分支）
      const messageCount = 1
      const flcnt = 0
      if (info.canfd) {
        //CANFD使能
        const fl = [
          messageCount,
          VECTOR.XL_CAN_TXMSG_FLAG_EDL,
          VECTOR.XL_CAN_TXMSG_FLAG_EDL | VECTOR.XL_CAN_TXMSG_FLAG_BRS
        ]
        const canTxEvt = new VECTOR.XLcanTxEvent()
        canTxEvt.tag = 0x0440
        // const tagData=VECTOR.XL_CAN_TX_MSG_UNION.frompointer(canTxEvt.tagData)
        // const msg = new VECTOR.XL_CAN_TX_MSG()
        // tagData.canMsg = msg

        // canTxEvt.tag.canMsg.canId = 0x723
        // // canTxEvt.tag.msgFlags = fl[flcnt % fl.length]
        // canTxEvt.tag.msgFlags = 3
        // canTxEvt.tag.dlc = 8

        // if (canTxEvt.tag.msgFlags & VECTOR.XL_CAN_TXMSG_FLAG_EDL) {
        //   canTxEvt.tag.dlc = 15
        // }
        // for (let i = 1; i < 64; i++) {
        //   canTxEvt.tag.data[i] = i - 1
        // }

        canTxEvt.tagData.canMsg.canId = 0x723
        // canTxEvt.tag.msgFlags = fl[flcnt % fl.length]
        canTxEvt.tagData.canMsg.msgFlags = 0
        canTxEvt.tagData.canMsg.dlc = 8

        if (canTxEvt.tagData.canMsg.msgFlags & VECTOR.XL_CAN_TXMSG_FLAG_EDL) {
          canTxEvt.tagData.canMsg.dlc = 15
        }
        const dataPtr = VECTOR.UINT8ARRAY.frompointer(canTxEvt.tagData.canMsg.data)
        for (let i = 1; i < 64; i++) {
          dataPtr.setitem(i, i - 1)
        }

        // const can_tx_msg = new VECTOR.XL_CAN_TX_MSG()
        // can_tx_msg.canId = 0x723
        // // can_tx_msg.msgFlags = fl[flcnt % fl.length]
        // can_tx_msg.msgFlags = 3
        // can_tx_msg.dlc = 8

        // if (can_tx_msg.msgFlags & VECTOR.XL_CAN_TXMSG_FLAG_EDL) {
        //   can_tx_msg.dlc = 15
        // }
        // for (let i = 1; i < 64; i++)

        // {
        //   can_tx_msg.data[i] = i - 1
        // }
        // canTxEvt.canMsg = can_tx_msg

        const cntSent = new VECTOR.UINT32()
        cntSent.assign(0)
        // cntSent.value = 1
        xlStatus = VECTOR.xlCanTransmitEx(
          PortHandle.value(),
          ConnectionConfigured.ChannelMask,
          messageCount,
          cntSent.cast(),
          canTxEvt
        )
        console.log('status', xlStatus, cntSent.value())
        if (xlStatus !== VECTOR.XL_SUCCESS) {
          // throw new Error('CanTransmitEx failed')
        } else {
          console.log('CanTransmitEx success', cntSent.value())
        }
      } else {
        //普通CAN
        const framedata = new VECTOR.XLevent()
        ;(framedata.tag = VECTOR.XL_TRANSMIT_MSG),
          (framedata.tag.tagData.msg.id = 0x722),
          (framedata.tag.tagData.msg.dlc = 8),
          (framedata.tag.tagData.msg.flags = 0),
          (framedata.tag.tagData.msg.data = [1, 2, 3, 4, 5, 6, 7, 8])
        xlStatus = VECTOR.xlCanTransmit(
          PortHandle.cast(),
          ConnectionConfigured.ChannelMask,
          messageCount,
          framedata
        )
      }
    } else {
      // LIN测试发送（完整逻辑）
      const framedata = new VECTOR.s_xl_lin_msg()
      ;(framedata.id = 0x3c),
        (framedata.dlc = 8),
        (framedata.data = [0x08, 0x02, 0x3e, 0x00, 0xff, 0xff, 0xff, 0xff])
      VECTOR.xlLinSendRequest(PortHandle.cast(), ConnectionConfigured.ChannelMask, framedata.id, 0)
      // await Sleep(10)

      const pEventCountSend = 1
      const LinMsgXLeventSend = new VECTOR.XLevent()
      ;(LinMsgXLeventSend.tag = 0),
        (LinMsgXLeventSend.tagData = { msg: { id: 0, dlc: 0, flags: 0, data: [] } })
      VECTOR.xlLinSendRequest(PortHandle.cast(), ConnectionConfigured.ChannelMask, 0x3d, 0)
      VECTOR.xlReceive(PortHandle.cast(), pEventCountSend, LinMsgXLeventSend)
    }

    VECTOR.CreateTSFN(
      //创建线程安全函数
      // numHandle.getitem(0),                                     //设备句柄
      // numHandle.getitem(1),
      this.id,
      this.id + 'fd',
      this.callback.bind(this), //标准CAN帧回调函数
      this.callbackFd.bind(this), //CANFD帧接收回调函数
      this.id + 'error' //错误处理
      // this.callbackError.bind(this)                           //总线错误事件回调
    )
    this.attachCanMessage(this.busloadCb)
  }

  // callbackError() {
  //   this.log.error(getTsUs() - this.startTime, 'bus error')    //总线错误事件回调
  //   this.close(true)                                          //关闭设备
  // }
  static loadDllPath(dllPath: string) {
    if (process.platform == 'win32') {
      VECTOR.LoadDll(dllPath) //加载设备DLL
    }
  }

  _read(frame: CANFrame, ts: number) {
    if (this.canMiniBug) {
      ts = getTsUs() - this.startTime
    } else {
      if (this.tsOffset == undefined) {
        this.tsOffset = ts - (getTsUs() - this.startTime)
      }
      ts = ts - this.tsOffset
    }

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

  async callback(num: number) {
    if (num == 0) {
      return
    }
    const frames = new VECTOR.ReceiveDataArray(num)
    const ret = 1
    // const ret = VECTOR.ZCAN_Receive(this.channel, frames.cast(), num, 0)
    if (ret > 0) {
      for (let i = 0; i < ret; i++) {
        const frame = frames.getitem(i)
        const id = frame.frame.can_id
        const data = Buffer.alloc(frame.frame.can_dlc)
        const b = VECTOR.ByteArray.frompointer(frame.frame.data)
        for (let j = 0; j < frame.frame.can_dlc; j++) {
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
          isEcho: frame.frame.__pad & 0x20 ? true : false
        }
        this._read(jsFrame, frame.timestamp)
        //让出时间片
        await new Promise((resolve) => {
          setImmediate(() => {
            resolve(null)
          })
        })
        // console.log(jsFrame)
      }
      // setImmediate(()=>{this.callback(100)})
    }
  }

  async callbackFd(num: number) {
    if (num == 0) {
      return
    }

    // CANFD接收处理
    //   let xlStatus: VECTOR.XLstatus;
    //   let len = 1;
    //   const CanMsgBuffer: VECTOR.XLcanRxEvent[] = new Array(1).fill({
    //       tag: 0,
    //       tagData: {
    //           canRxOkMsg: {
    //               canId: 0,
    //               dlc: 0,
    //               data: []
    //           }
    //       }
    //   });

    //   xlStatus = 0; // XL_SUCCESS

    //   // 模拟xlCanReceive调用
    //   xlStatus = VECTOR.canReceive(VECTOR.PortHandle.cast(), CanMsgBuffer);

    //   if (xlStatus === VECTOR.XL_ERR_QUEUE_IS_EMPTY) {
    //       break;
    //   } else {
    //     if (IS_RTR(CanMsgBuffer[1].tagData.canRxOkMsg.canId) === 0) {
    //         if (CanMsgBuffer[1].tag === VECTOR.XL_CAN_EV_TAG_RX_OK) {
    //             if (CanMsgBuffer[1].tagData.canRxOkMsg.canId === gDeviceParameters.resp_id) {
    //                 if (CanMsgBuffer[1].tagData.canRxOkMsg.dlc > 64) continue;

    //                 m_stRxCanInfo.DataId = CanMsgBuffer[1].tagData.canRxOkMsg.canId;
    //                 m_stRxCanInfo.Index = 0;
    //                 m_stRxCanInfo.DataPtr = CanMsgBuffer[1].tagData.canRxOkMsg.data;

    //                 switch (CanMsgBuffer[1].tagData.canRxOkMsg.dlc) {
    //                     case 9: m_stRxCanInfo.len = 12; break;
    //                     case 10: m_stRxCanInfo.len = 16; break;
    //                     case 11: m_stRxCanInfo.len = 20; break;
    //                     case 12: m_stRxCanInfo.len = 24; break;
    //                     case 13: m_stRxCanInfo.len = 32; break;
    //                     case 14: m_stRxCanInfo.len = 48; break;
    //                     case 15: m_stRxCanInfo.len = 64; break;
    //                     default: m_stRxCanInfo.len = CanMsgBuffer[1].tagData.canRxOkMsg.dlc;
    //                 }

    //                 emitter.emit('sgnlCanTpRx', { ...m_stRxCanInfo });
    //             }
    //         }
    //     }
    //   }

    //   const frames = new VECTOR.ReceiveFDDataArray(num)                      //接收数组
    //   const ret = VECTOR.ZCAN_ReceiveFD(this.channel, frames.cast(), num, 0) //接收
    //   if (ret > 0) {                                                      //有数据
    //     for (let i = 0 i < ret i++) {
    //       const frame = frames.getitem(i)
    //       const id = frame.frame.can_id
    //       const data = Buffer.alloc(frame.frame.len)
    //       const b = VECTOR.ByteArray.frompointer(frame.frame.data)
    //       for (let j = 0 j < data.length j++) {
    //         data[j] = b.getitem(j)
    //       }
    //       const jsFrame: CANFrame = {
    //         canId: id & 0x1fffffff,
    //         msgType: {
    //           idType: id & 0x80000000 ? CAN_ID_TYPE.EXTENDED : CAN_ID_TYPE.STANDARD,
    //           brs: frame.frame.flags & 0x01 ? true : false,
    //           canfd: true,
    //           remote: id & 0x40000000 ? true : false
    //         },
    //         data: data,
    //         isEcho: frame.frame.flags & 0x20 ? true : false
    //       }
    //       this._read(jsFrame, frame.timestamp)                            //读取解析后的报文
    //       //让出时间片
    //       await new Promise((resolve) => {                                //等待下一个报文
    //         setImmediate(() => {
    //           resolve(null)
    //         })
    //       })
    //     }
    //     // setImmediate(()=>{this.callbackFd(100)})
    //   }
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
      console.log('valid channle count', deviceHandle.channelCount)
      if (ret === VECTOR.XL_SUCCESS) {
        const channles = VECTOR.CHANNEL_CONFIG.frompointer(deviceHandle.channel) //通道配置
        for (let num = 0; num < deviceHandle.channelCount; num++) {
          //设备通道循环索引
          const channel = channles.getitem(num) //通道数组索引
          const channelName = channel.name.replace(/\0/g, '') //通道名称
          let busType = ''

          if (channel.transceiverName.indexOf('LIN') !== -1) {
            busType = '#LIN' //总线类型
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
      return '25.3.17.16'
    }
    return 'only support windows'
  }

  close(isReset = false, msg?: string) {
    //关闭设备
    // clearInterval(this.timer)

    this.readAbort.abort() //中止Web请求

    for (const [key, value] of this.rejectBaseMap) {
      //
      value.reject(new CanError(CAN_ERROR_ID.CAN_BUS_CLOSED, value.msgType))
    }
    this.rejectBaseMap.clear() //移除 Map 对象的所有键/值对

    //pendingBaseCmds
    for (const [key, vals] of this.pendingBaseCmds) {
      for (const val of vals) {
        val.reject(new CanError(CAN_ERROR_ID.CAN_BUS_CLOSED, val.msgType))
      }
    }
    this.pendingBaseCmds.clear()

    if (isReset) {
      //开启复位
      // VECTOR.ZCAN_ResetCAN(this.channel)                         //复位设备
      // VECTOR.ZCAN_StartCAN(this.channel)
      //this._close(CAN_ERROR_ID.CAN_BUS_CLOSED, msg)
    } else {
      //不复位
      this.closed = true
      this.log.close()

      const target = deviceMap.get(`${this.deviceType}_${this.index}`)
      if (target) {
        //获取
        //remove this channel

        target.channel = target.channel.filter((item) => item != this)
        if (target.channel.length == 0) {
          //close device
          VECTOR.ZCAN_CloseDevice(this.handle)
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

        if (msgType.canfd) {
          const frame = new VECTOR.ZCAN_TransmitFD_Data() //CANFD数据结构
          frame.transmit_type = 0
          let rid = id

          if (msgType.idType == CAN_ID_TYPE.EXTENDED) {
            rid += 0x80000000
          }
          if (msgType.remote) {
            rid += 0x40000000
          }
          frame.frame.can_id = rid
          //TX_ECHO_FLAG
          frame.frame.flags |= 0x20
          if (msgType.brs) {
            frame.frame.flags |= 0x01
          }
          frame.frame.len = data.length
          const b = VECTOR.ByteArray.frompointer(frame.frame.data)

          for (let i = 0; i < data.length; i++) {
            b.setitem(i, data[i])
          }
          const len = 1
          // const len = VECTOR.ZCAN_TransmitFD(this.channel, frame, 1) //CANFD发送
          if (len != 1) {
            this.pendingBaseCmds.get(cmdId)?.pop()
            // const err = this.getError()
            // this.close(true)
            reject(new CanError(CAN_ERROR_ID.CAN_INTERNAL_ERROR, msgType, data))
            // this.log.error((getTsUs() - this.startTime),'bus error')
          }
        } else {
          const frame = new VECTOR.ZCAN_Transmit_Data() //CAN帧结构
          frame.transmit_type = 0
          let rid = id

          if (msgType.idType == CAN_ID_TYPE.EXTENDED) {
            rid += 0x80000000
          }
          if (msgType.remote) {
            rid += 0x40000000
          }
          frame.frame.can_id = rid
          //TX_ECHO_FLAG
          frame.frame.__pad = 0x20
          if (this.canMiniBug) {
            frame.frame.__pad = 0x00
          }
          frame.frame.can_dlc = data.length
          const b = VECTOR.ByteArray.frompointer(frame.frame.data)

          for (let i = 0; i < data.length; i++) {
            b.setitem(i, data[i])
          }
          const len = 1
          // const len = VECTOR.ZCAN_Transmit(this.channel, frame, 1) //CAN发送
          if (len != 1) {
            //发送错误
            this.pendingBaseCmds.get(cmdId)?.pop()
            // const msg = this.getError()
            reject(new CanError(CAN_ERROR_ID.CAN_INTERNAL_ERROR, msgType, data))
            // this.close(true)
            // this.log.error((getTsUs() - this.startTime),'bus error')
          } else {
            //发送成功
            if (this.canMiniBug) {
              setTimeout(() => {
                this._read(
                  {
                    canId: id,
                    msgType: msgType,
                    isEcho: true,
                    data
                  },
                  getTsUs() - this.startTime
                )
              }, 0)
            }
          }
        }
      }
    )
  }

  getError() {
    //获取错误
    const errInfo = new VECTOR.ZCAN_CHANNEL_ERR_INFO()
    // VECTOR.ZCAN_ReadChannelErrInfo(this.channel, errInfo)
    const errCode = errInfo.error_code
    let msg = ''
    if (errCode & 0x0001) {
      msg += 'ZCAN_ERROR_CAN_OVERFLOW '
    }
    if (errCode & 0x0002) {
      msg += 'ZCAN_ERROR_CAN_ERRALARM '
    }
    if (errCode & 0x0004) {
      msg += 'ZCAN_ERROR_CAN_PASSIVE '
    }
    if (errCode & 0x0008) {
      msg += 'ZCAN_ERROR_CAN_LOSE '
    }
    if (errCode & 0x0010) {
      msg += 'ZCAN_ERROR_CAN_BUSERR '
    }
    if (errCode & 0x0020) {
      msg += 'ZCAN_ERROR_CAN_BUSOFF '
    }
    if (errCode & 0x0040) {
      msg += 'ZCAN_ERROR_CAN_BUFFER_OVERFLOW '
    }
    if (errCode & 0x0100) {
      msg += 'ZCAN_ERROR_DEVICEOPENED '
    }
    if (errCode & 0x0200) {
      msg += 'ZCAN_ERROR_DEVICEOPEN '
    }
    if (errCode & 0x0400) {
      msg += 'ZCAN_ERROR_DEVICENOTOPEN '
    }
    if (errCode & 0x0800) {
      msg += 'ZCAN_ERROR_BUFFEROVERFLOW '
    }
    if (errCode & 0x1000) {
      msg += 'ZCAN_ERROR_DEVICENOTEXIST '
    }
    if (errCode & 0x2000) {
      msg += 'ZCAN_ERROR_LOADKERNELDLL '
    }
    if (errCode & 0x4000) {
      msg += 'ZCAN_ERROR_CMDFAILED '
    }
    if (errCode & 0x8000) {
      msg += 'ZCAN_ERROR_BUFFERCREATE '
    }
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
