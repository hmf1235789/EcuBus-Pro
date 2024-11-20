import os from 'os'
import { EthAddr, EthDevice } from '../share/doip'
import net from 'net'
import dgram from 'dgram'
import EventEmitter from 'events'

export function getEthDevices() {
    const ifaces = os.networkInterfaces()
    const ethDevices: EthDevice[] = []
    if (!ifaces) return ethDevices
    for (const [name, iface] of Object.entries(ifaces)) {
        //just ethernet devices
        if (iface) {
            for (const eth of iface) {
                if (eth.family === 'IPv4') {
                    ethDevices.push({
                        label: name,
                        id: eth.mac,
                        handle: eth.address,
                        detail: eth
                    })
                    break
                }
            }
        }
    }
    return ethDevices
}

export enum PayloadType {
    DoIP_HeaderNegativeAcknowledge = 0, //udp, tcp
    DoIP_VehicleIdentificationRequest = 0x0001,//udp(13400)
    DoIP_VehicleIdentificationRequestWithEID = 0x0002,//udp(13400)
    DoIP_VehicleIdentificationRequestWithVIN = 0x0003,//udp(13400)
    DoIP_VehicleAnnouncementResponse = 0x0004,//udp
    DoIP_RouteActivationRequest = 0x0005,//tcp
    DoIP_RouteActivationResponse = 0x0006,//tcp
    DoIP_AliveRequest = 0x0007,//tcp
    DoIP_AliveResponse = 0x0008,//tcp
    DoIP_EntityStateRequest = 0x4001,//udp(13400)
    DoIP_EntityStateResponse = 0x4002,//udp
    DoIP_PowerModeInfoRequest = 0x4003,//udp(13400)
    DoIP_PowerModeInfoResponse = 0x4004,//udp
    DoIP_DiagnosticMessage = 0x8001,//tcp
    DoIP_DiagnosticMessagePositiveAcknowledge = 0x8002,//tcp
    DoIP_DiagnosticMessageNegativeAcknowledge = 0x8003,//tcp
}

type eventMap = {
    [key in PayloadType]: [EthAddr, Buffer]
}

type additionalEvents = {
    'tcpData': [net.Socket, PayloadType, Buffer]
}

interface EventMap extends eventMap, additionalEvents { }



export enum NackCode {
    DoIP_IncorrectPatternFormatCode = 0,
    DoIP_InvalidPayloadTypeFormatCode = 1,
    DoIP_MessageTooLarge = 2,
    DoIP_OutOfMemory = 3,
    DoIP_InvalidPayloadLength = 4,
}

export enum RouteCode {
    DoIP_UnknownSa = 0,
    DoIP_NoSocket = 1,
    DoIp_SaDiff = 2,
    DoIP_SaUsed = 3,
    DoIP_MissAuth = 4,
    DoIP_RejectConfirm = 5,
    DoIP_UnsupportedActiveType = 6,
    DoIP_OK = 0x10,
    DoIP_AcceptedNeedConfirm = 0x11,
}

function getTsUs() {
    const hrtime = process.hrtime()
    const seconds = hrtime[0];
    const nanoseconds = hrtime[1];
    return seconds * 1000000 + Math.floor(nanoseconds / 1000)
}


interface GenericHeaderAction {
    payloadType: PayloadType
    value?: NackCode
    payloadLength: number
}

interface tcpData {
    state: 'init' | 'sa-check' | 'register-pending-confirm' | 'register-pending-auth' | 'register-active',
    inactiveTimer: NodeJS.Timeout,
    generalTimer: NodeJS.Timeout,
    aliveTimer?: {
        socket:net.Socket,
        timer:NodeJS.Timeout
    },
    authInfo?: any
    confirmInfo?: any
    socket: net.Socket
    sa?: number
    recvState: 'header' | 'payload'
    pendingBuffer: Buffer
    payloadLen: number
    lastAction?: GenericHeaderAction
}

export class DOIP {
    version = 2
    initTimeout = 2000
    aliveTimeout = 500
    generalTimeout = 5 * 60 * 1000

    inverseVersion = 0xfd
    private tcpServer: net.Server
    private udp4Server: dgram.Socket
    minLne = 8
    event = new EventEmitter<EventMap>()
    vecuList: EthAddr[] = []
    connectTable: tcpData[] = []
    /* version| inverseVersion| payloadType(2)| len(4)| content */
    constructor(private eth: EthDevice, private ethAddr: EthAddr) {
        //create tcp server bind to eth port 13400
        const server = net.createServer()
        this.tcpServer = server.listen(13400, eth.handle)
        server.on('connection', (socket) => {

            const item: tcpData = {
                socket: socket,
                state: 'init',
                recvState: 'header',
                pendingBuffer: Buffer.alloc(0),
                inactiveTimer: setTimeout(() => {
                    //find in connectTable, remove it
                    const index = this.connectTable.findIndex((item) => item.socket == socket)
                    if (index >= 0) {
                        const item = this.connectTable[index]
                        if (item.state == 'init') {
                            this.connectTable.splice(index, 1)
                            socket.end()
                        }

                    }
                }, this.initTimeout),
                generalTimer: setTimeout(() => {
                    //find in connectTable, remove it
                    const index = this.connectTable.findIndex((item) => item.socket == socket)
                    if (index >= 0) {

                        if(this.connectTable[index].state!='init'){
                            this.connectTable.splice(index, 1)
                            socket.end()
                        }


                    }
                }, this.generalTimeout),
                payloadLen: 0
            }
            this.connectTable.push(item)
            socket.on('data', (val) => {
                //restart timer
                item.generalTimer.refresh()

                this.parseData(socket, item, val, true)
            })
            socket.on('close', () => {
                this.closeSocket(socket)
            })
            socket.on('error', (err) => {
                this.closeSocket(socket)
            })


        })
        server.on('error', (err) => {
            console.log('tcpServer error:', err)
        })
        //create udp server bind to eth port 13400
        this.udp4Server = dgram.createSocket('udp4')
        this.udp4Server.bind(13400, eth.handle)
        this.udp4Server.on('error', (err) => {
            console.log('udp4Server error:', err)
        })
        this.udp4Server.on('message', (msg, rinfo) => {
            console.log('udp4Server message:', msg.toString(), rinfo)
        })
    }
    closeSocket(socket: net.Socket) {
        const index = this.connectTable.findIndex((item) => item.socket == socket)
        if (index >= 0) {
            const item = this.connectTable[index]
            clearTimeout(item.inactiveTimer)
            clearTimeout(item.generalTimer)
            socket.destroy()
            this.connectTable.splice(index, 1)
        }
    }
    getId(input: tcpData) {
        return `${input.sa}-${input.socket.remoteAddress}-${input.socket.remotePort}`
    }
    parseData(socket: net.Socket, item: tcpData, data: Buffer, isTcp: boolean) {
        if (item.recvState == 'header' && (item.pendingBuffer.length + data.length) < this.minLne) {
            item.pendingBuffer = Buffer.concat([item.pendingBuffer, data])
            return
        }
        if (item.recvState == 'payload' && (item.pendingBuffer.length + data.length) < item.payloadLen) {
            item.pendingBuffer = Buffer.concat([item.pendingBuffer, data])
            return
        }
        const buffer = Buffer.concat([item.pendingBuffer, data])
        if (item.recvState == 'header') {
            //header
            const action = this.headerHandler(buffer, isTcp)
            //doip-045||doip-041
            if (action.value != undefined && (action.value == NackCode.DoIP_IncorrectPatternFormatCode || action.value == NackCode.DoIP_InvalidPayloadLength)) {

                this.closeSocket(socket)
                return

            } else {
                item.lastAction = action
            }
            if (item.payloadLen > 0) {
                item.recvState = 'payload'
            } else {
                if (item.lastAction?.value) {

                    const reply = this.getHeaderNegativeAcknowledge(item.lastAction.value)
                    socket.write(reply, () => {
                        item.generalTimer.refresh()
                    })
                }
            }
            item.pendingBuffer = buffer.subarray(this.minLne)
            if (item.recvState == 'header') {
                if (item.pendingBuffer.length >= this.minLne) {
                    this.parseData(socket, item, Buffer.from(item.pendingBuffer), isTcp)
                }
            } else {
                if (item.pendingBuffer.length >= item.payloadLen) {
                    this.parseData(socket, item, Buffer.from(item.pendingBuffer), isTcp)
                }
            }
        } else {
            //payload
            if (buffer.length >= item.payloadLen) {

                // if(item.lastAction?.payloadType==PayloadType.DoIP_RouteActivationRequest){
                //     clearTimeout(item.inactiveTimer)
                // }


                //has enough data
                if (item.lastAction == undefined || item.lastAction.value != undefined) {
                    const code = item.lastAction?.value || NackCode.DoIP_InvalidPayloadTypeFormatCode
                    const reply = this.getHeaderNegativeAcknowledge(code)
                    socket.write(reply, () => {
                        item.generalTimer.refresh()
                    })
                } else {
                    if (item.lastAction.payloadType == PayloadType.DoIP_RouteActivationRequest) {
                        const sa = buffer.readUInt16BE(0)
                        if(item.state=='init'){
                            item.sa=sa
                            clearTimeout(item.inactiveTimer)
                           
                           
                            //if sa in connectTable, do alive check
                            const sitem = this.connectTable.find((item) => item.sa == item.sa && item.state != 'init')
                            if(sitem){
                                item.state = 'sa-check'
                                this.aliveCheck(socket,item.sa)
                               
                            }else{
                                item.state = 'register-active'
                                item.socket.write(this.getRouteActiveResponse(item.sa,RouteCode.DoIP_OK))
                            }
                        }else{
                            if(item.sa!=sa){
                                item.socket.write(this.getRouteActiveResponse(sa,RouteCode.DoIp_SaDiff))
                                this.closeSocket(item.socket)
                            }
                        }
                    }else{
                        if(item.state!='register-active'){
                            //error
                        }else{
                            //normal
                            if(item.lastAction.payloadType==PayloadType.DoIP_AliveResponse){
                                if(item.aliveTimer){
                                    //alive response received
                                    clearTimeout(item.aliveTimer.timer)
                                    const sitem=this.connectTable.find((item)=>item.socket==item.aliveTimer?.socket)
                                    if(sitem&&sitem.sa!=undefined){
                                        sitem.socket.write(this.getRouteActiveResponse(sitem.sa,RouteCode.DoIP_SaUsed))
                                        this.closeSocket(sitem.socket)
                                    }
                                    item.aliveTimer=undefined
                                  
                                }
                            }
                        }
                    }

                    // this.event.emit('tcpData', socket, item.lastAction.payloadType, buffer.subarray(0, item.payloadLen))
                }
                item.recvState = 'header'
                item.pendingBuffer = buffer.subarray(item.payloadLen)
            }
        }
    }
    async writeUdp(data: Buffer, port: number = 13400): Promise<number> {
        return new Promise((resolve, reject) => {
            this.udp4Server.send(data, port, this.eth.handle, (err) => {
                if (err) {
                    reject(err)
                } else {

                    resolve(getTsUs())
                }
            })
        })
    }
    async writeUdpResponse(socket: dgram.Socket, data: Buffer): Promise<number> {
        return new Promise((resolve, reject) => {
            socket.send(data, (err) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(getTsUs())
                }
            })
        })
    }
    async tcpConnect(host: string, port: number = 13400): Promise<net.Socket> {
        return new Promise((resolve, reject) => {
            const socket = net.createConnection(port, host, () => {
                resolve(socket)
            })
            socket.on('error', (err) => {
                reject(err)
            })
        })

    }
    close() {
        this.tcpServer.close()
        this.udp4Server.close()
    }
    buildMessage(payloadType: PayloadType, data: Buffer): Buffer {
        const len = data.length
        const buf = Buffer.alloc(8 + len)
        buf.writeUInt16BE(this.version, 0)
        buf.writeUInt8(this.inverseVersion, 1)
        buf.writeUInt16BE(payloadType, 2)
        buf.writeUInt32BE(len, 4)
        data.copy(buf, 8)
        return buf
    }
    headerHandler(data: Buffer, isTcp = true): GenericHeaderAction {

        const action: GenericHeaderAction = {
            payloadType: data.readUInt16BE(2),
            payloadLength: 0
        }
        //Check Generic DoIP synchronization pattern
        if (((data[1] ^ (0xFF)) & 0xff) != data[0]) {
            //Return Error, Protocol Version not correct
            action.payloadType = PayloadType.DoIP_HeaderNegativeAcknowledge;
            action.value = NackCode.DoIP_IncorrectPatternFormatCode;
            action.payloadLength = 0;
            throw action;
        }
        const payloadLength = data.readUint32BE(4)
        action.payloadLength = payloadLength
        const inputPayloadType = data.readUInt16BE(2) as PayloadType
        //Check if the payload type is valid
        const valid = Object.values(PayloadType).includes(inputPayloadType)
        if (!valid) {
            //Return Error, Invalid Payload Type
            action.payloadType = PayloadType.DoIP_HeaderNegativeAcknowledge;
            action.value = NackCode.DoIP_InvalidPayloadTypeFormatCode;
            return action;
        }
        const tcpType = [PayloadType.DoIP_RouteActivationRequest, PayloadType.DoIP_DiagnosticMessage, PayloadType.DoIP_DiagnosticMessagePositiveAcknowledge, PayloadType.DoIP_DiagnosticMessageNegativeAcknowledge, PayloadType.DoIP_AliveRequest, PayloadType.DoIP_AliveResponse, PayloadType.DoIP_AliveResponse]
        if (isTcp) {
            if (!tcpType.includes(inputPayloadType)) {
                return action
            }
        } else {
            if (tcpType.includes(inputPayloadType)) {
                return action
            }
        }
        //check if the payload length is valid
        switch (inputPayloadType) {
            case PayloadType.DoIP_HeaderNegativeAcknowledge:
                if (payloadLength != 1) {

                    action.payloadType = PayloadType.DoIP_HeaderNegativeAcknowledge;
                    action.value = NackCode.DoIP_InvalidPayloadLength;
                    return action;
                }
                break;
            case PayloadType.DoIP_VehicleIdentificationRequest:
                if (payloadLength != 0) {
                    action.payloadType = PayloadType.DoIP_HeaderNegativeAcknowledge;
                    action.value = NackCode.DoIP_InvalidPayloadLength;
                    return action;
                }
                break;
            case PayloadType.DoIP_VehicleIdentificationRequestWithEID:
                if (payloadLength != 6) {
                    action.payloadType = PayloadType.DoIP_HeaderNegativeAcknowledge;
                    action.value = NackCode.DoIP_InvalidPayloadLength;
                    return action;
                }
                break;
            case PayloadType.DoIP_VehicleIdentificationRequestWithVIN:
                if (payloadLength != 17) {
                    action.payloadType = PayloadType.DoIP_HeaderNegativeAcknowledge;
                    action.value = NackCode.DoIP_InvalidPayloadLength;
                    return action;
                }
                break;
            case PayloadType.DoIP_VehicleAnnouncementResponse:
                if (payloadLength != 32 && payloadLength != 33) {
                    action.payloadType = PayloadType.DoIP_HeaderNegativeAcknowledge;
                    action.value = NackCode.DoIP_InvalidPayloadLength;
                    return action;
                }
                break
            case PayloadType.DoIP_RouteActivationRequest:
                if (payloadLength != 7 && payloadLength != 11) {
                    action.payloadType = PayloadType.DoIP_HeaderNegativeAcknowledge;
                    action.value = NackCode.DoIP_InvalidPayloadLength;
                    return action;
                }
                break
            case PayloadType.DoIP_RouteActivationResponse:
                if (payloadLength != 9 && payloadLength != 13) {
                    action.payloadType = PayloadType.DoIP_HeaderNegativeAcknowledge;
                    action.value = NackCode.DoIP_InvalidPayloadLength;
                    return action;
                }
                break
            case PayloadType.DoIP_DiagnosticMessage:
                if (payloadLength <= 4) {
                    action.payloadType = PayloadType.DoIP_HeaderNegativeAcknowledge;
                    action.value = NackCode.DoIP_InvalidPayloadLength;
                    return action;
                }
                break
            case PayloadType.DoIP_DiagnosticMessagePositiveAcknowledge:
                if (payloadLength < 5) {
                    action.payloadType = PayloadType.DoIP_HeaderNegativeAcknowledge;
                    action.value = NackCode.DoIP_InvalidPayloadLength;
                    return action;
                }
                break
            case PayloadType.DoIP_DiagnosticMessageNegativeAcknowledge:
                if (payloadLength < 5) {
                    action.payloadType = PayloadType.DoIP_HeaderNegativeAcknowledge;
                    action.value = NackCode.DoIP_InvalidPayloadLength;
                    return action;
                }
                break
            case PayloadType.DoIP_AliveRequest:
                if (payloadLength != 0) {
                    action.payloadType = PayloadType.DoIP_HeaderNegativeAcknowledge;
                    action.value = NackCode.DoIP_InvalidPayloadLength;
                    return action;
                }
                break
            case PayloadType.DoIP_AliveResponse:
                if (payloadLength != 2) {
                    action.payloadType = PayloadType.DoIP_HeaderNegativeAcknowledge;
                    action.value = NackCode.DoIP_InvalidPayloadLength;
                    return action;
                }
                break
            case PayloadType.DoIP_PowerModeInfoRequest:
                if (payloadLength != 0) {
                    action.payloadType = PayloadType.DoIP_HeaderNegativeAcknowledge;
                    action.value = NackCode.DoIP_InvalidPayloadLength;
                    return action;
                }
                break
            case PayloadType.DoIP_PowerModeInfoResponse:
                if (payloadLength != 1) {
                    action.payloadType = PayloadType.DoIP_HeaderNegativeAcknowledge;
                    action.value = NackCode.DoIP_InvalidPayloadLength;
                    return action;
                }
                break
            case PayloadType.DoIP_EntityStateRequest:
                if (payloadLength != 0) {
                    action.payloadType = PayloadType.DoIP_HeaderNegativeAcknowledge;
                    action.value = NackCode.DoIP_InvalidPayloadLength;
                    return action;
                }
                break
            case PayloadType.DoIP_EntityStateResponse:
                if (payloadLength != 3 && payloadLength != 4) {
                    action.payloadType = PayloadType.DoIP_HeaderNegativeAcknowledge;
                    action.value = NackCode.DoIP_InvalidPayloadLength;
                    return action;
                }
                break
            default:
                action.payloadType = PayloadType.DoIP_HeaderNegativeAcknowledge;
                action.value = NackCode.DoIP_InvalidPayloadTypeFormatCode;
        }
        return action
    }
    vehicleIdentificationHandle(payloadType: PayloadType, data: Buffer, addr: EthAddr) {
        let reply = false
        if (payloadType == PayloadType.DoIP_VehicleIdentificationRequest) {
            reply = true
        } else if (payloadType == PayloadType.DoIP_VehicleIdentificationRequestWithEID) {
            const eid = data.toString('hex')
            //join '-' every two characters
            let seid = ''
            for (let i = 2; i < eid.length; i += 3) {
                seid += eid.slice(i - 2, i) + '-'
            }
            seid = seid.slice(0, -1)
            if (seid == addr.vecu.eid) {
                reply = true
            }
        } else if (payloadType == PayloadType.DoIP_VehicleIdentificationRequestWithVIN) {
            const vin = data.toString('ascii')
            if (vin == addr.vecu.vin) {
                reply = true
            }
        }
        if (reply) {
            //send response
            this.event.emit(payloadType, addr, data)
        }
    }
    getHeaderNegativeAcknowledge(code: NackCode): Buffer {
        const data = Buffer.alloc(1)
        data.writeUInt8(code & 0xff, 0)
        return this.buildMessage(PayloadType.DoIP_HeaderNegativeAcknowledge, data)
    }
    
    getVehicleAnnouncementResponse(addr: EthAddr, further: number, sync?: number): Buffer {
        const dataLen = addr.vecu.sendSync ? 33 : 32
        const data = Buffer.alloc(dataLen)
        //vin
        data.write(addr.vecu.vin, 0, 17, 'ascii')
        //logical address
        const naddr = Number(addr.ecuLogicalAddr) & 0xffff
        data.writeUInt16BE(naddr, 17)
        //eid
        const eid = addr.vecu.eid.split('-').join('')
        data.write(eid, 19, 6, 'hex')
        //gid
        const gid = addr.vecu.gid.split('-').join('')
        data.write(gid, 25, 6, 'hex')
        //further action
        data.writeUInt8(further & 0xff, 31)
        if (addr.vecu.sendSync) {
            data.writeUInt8((sync || 0) & 0xff, 32)
        }
        return this.buildMessage(PayloadType.DoIP_VehicleAnnouncementResponse, data)
    }
    getDiagnosticMessagePositiveAcknowledge(addr: EthAddr, ee: Buffer) {
        const data = Buffer.alloc(5 + ee.length)
        data.writeUInt16BE(Number(addr.ecuLogicalAddr), 0)
        data.writeUInt16BE(Number(addr.testerLogicalAddr), 2)
        data.writeUInt8(0, 4)
        ee.copy(data, 5)
        return this.buildMessage(PayloadType.DoIP_DiagnosticMessagePositiveAcknowledge, data)
    }
    getDiagnosticMessageNegativeAcknowledge(addr: EthAddr, code: number, ee: Buffer) {
        const data = Buffer.alloc(5 + ee.length)
        data.writeUInt16BE(Number(addr.ecuLogicalAddr), 0)
        data.writeUInt16BE(Number(addr.testerLogicalAddr), 2)
        data.writeUInt8(code & 0xff, 4)
        ee.copy(data, 5)
        return this.buildMessage(PayloadType.DoIP_DiagnosticMessageNegativeAcknowledge, data)
    }
    getRouteActiveResponse(sa:number,code: RouteCode, oem?: number) {
        const dataLen = oem == undefined ? 9 : 13
        const data = Buffer.alloc(dataLen, 0)
        //logical address
        const naddr = sa & 0xffff
        data.writeUInt16BE(naddr, 0)
        const eaddr = Number(this.ethAddr.ecuLogicalAddr) & 0xffff
        data.writeUInt16BE(eaddr, 2)
        data.writeUInt8(code & 0xff, 4)
        if (oem != undefined) {
            data.writeUInt32BE(oem & 0xffffffff, 9)
        }
        return this.buildMessage(PayloadType.DoIP_RouteActivationResponse, data)
    }
    aliveCheck(startSocket:net.Socket,sa?: number,) {
        const doCheck = (ta: number) => {
            const item = this.connectTable.find((item) => item.sa == ta && item.state != 'init')
            if (item) {
                item.socket.write(this.getAliveCheckRequest())
                item.aliveTimer = {
                    socket:startSocket,
                    timer:setTimeout(() => {
                        this.closeSocket(item.socket)
                        const startItem=this.connectTable.find((item)=>item.socket==startSocket)
                        if(startItem&&startItem.state=='sa-check'){
                            startItem.state='register-active'
                        }

                    },this.aliveTimeout)
                }
            }
        }
        if (sa!=undefined) {
            doCheck(sa)
        } else {
            for (const item of this.connectTable) {
                if(item.socket!=startSocket&&item.sa!=undefined){
                    doCheck(item.sa)
                }
                
            }
        }
    }

    getAliveCheckRequest() {
        const data = Buffer.alloc(0)
        return this.buildMessage(PayloadType.DoIP_AliveRequest, data)
    }
    routeActiveHandle(data: Buffer, addr: EthAddr) {
        const sa = data.readUInt16BE(0)
        if (sa == Number(addr.testerLogicalAddr)) {
            //send response
            this.event.emit(PayloadType.DoIP_RouteActivationRequest, addr, data)
        }
    }
    diagReqHandle(data: Buffer, addr: EthAddr) {
        const sa = data.readUInt16BE(0)
        const ta = data.readUInt16BE(2)
        if (sa == Number(addr.testerLogicalAddr) && ta == Number(addr.ecuLogicalAddr)) {
            //send response
            this.event.emit(PayloadType.DoIP_DiagnosticMessage, addr, data)
        }
    }
}


