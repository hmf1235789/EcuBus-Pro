import { EventTriggeredFrame, Frame, LDF, SchTable } from "src/renderer/src/database/ldfParse"
import { getFrameData, getPID, LinBaseInfo, LinChecksumType, LinDevice, LinDirection, LinMode, LinMsg } from "../share/lin"
import EventEmitter from "events"
import { LinLOG } from "../log"
import { getTsUs } from "../share/can"

export default abstract class LinBase {

    sch?: {
        activeSchName: string,
        timer: NodeJS.Timeout,
        activeIndex: number,
        lastActiveSchName?: string
        lastActiveIndex: number
    }
    abstract info: LinBaseInfo
    abstract log: LinLOG
    nodeList: {
        db: LDF,
        nodeName: string
    }[] = []
    
    constructor(info: LinBaseInfo) {


    }
    abstract event: EventEmitter
    static getValidDevices(): LinDevice[] {
        throw new Error('Method not implemented.')
    }
    attachLinMessage(cb: (msg: LinMsg) => void) {
        this.event.on('lin-frame', cb)
    }
    detachLinMessage(cb: (msg: LinMsg) => void) {
        this.event.off('lin-frame', cb)
    }
    // calculateChecksum(data: Buffer, checksumType: LinChecksumType): number {
    //     let checksum = 0
    //     if (checksumType == LinChecksumType.CLASSIC) {
    //         for (let i = 0; i < data.length; i++) {
    //             checksum += data[i]
    //         }
    //         checksum = 0xff - (checksum & 0xff)
    //     } else {
    //         for (let i = 0; i < data.length; i++) {
    //             checksum += data[i]
    //             checksum = (checksum & 0xff) + (checksum >> 8)
    //         }
    //         checksum = 0xff - checksum
    //     }
    //     return checksum
    // }
    setupEntry(workNode: string){
        if (this.info.database) {
            const db = global.database.lin[this.info.database]
            if (db) {
                //setup entry for unconditional frames
                for (const frameName in db.frames) {
                    const frame = db.frames[frameName]
                    if (frame.publishedBy === workNode) {
                        const checksum = (frame.id == 0x3c || frame.id == 0x3d) ?
                            LinChecksumType.CLASSIC : LinChecksumType.ENHANCED
                        this.setEntry(
                            frame.id,
                            frame.frameSize,
                            LinDirection.SEND,
                            checksum,
                            getFrameData(db, frame),
                            1
                        )
                    }
                }

                //setup entry for event triggered frames
                for (const eventFrameName in db.eventTriggeredFrames) {
                    const eventFrame = db.eventTriggeredFrames[eventFrameName]
                    // Check if any associated frame is published by this node
                    const containsPublishedFrame = eventFrame.frameNames.some(fname =>
                        db.frames[fname]?.publishedBy === workNode
                    )

                    if (containsPublishedFrame) {
                        // Find max frame size among associated frames
                        let maxFrameSize = 0
                        eventFrame.frameNames.forEach(fname => {
                            const frame = db.frames[fname]
                            if (frame && frame.frameSize > maxFrameSize) {
                                maxFrameSize = frame.frameSize
                            }
                        })

                        this.setEntry(
                            eventFrame.frameId,
                            maxFrameSize + 1, // +1 for PID
                            LinDirection.SEND,
                            LinChecksumType.ENHANCED,
                            Buffer.alloc(maxFrameSize + 1),
                            2 | 4
                        )
                    }
                }


                return db
            }
        }
        return undefined
    }
    
    abstract close(): void
    abstract setEntry(frameId: number, length: number, dir: LinDirection, checksumType: LinChecksumType, initData: Buffer, flag: number): void
    // abstract registerNode(nodeName:string):void
    abstract write(m: LinMsg): Promise<number>;

    registerNode(db: LDF, nodeName: string) {
        //find node

        const node = this.nodeList.find(n => n.db.name == db.name && n.nodeName == nodeName)
        if (node) {
            return
        }
        this.nodeList.push({ db, nodeName })
    }
    stopSch() {
        if (this.sch) {
            clearTimeout(this.sch.timer)
            this.sch = undefined
        }
    }
    checkEventFramePID(data:number){
        const id=data&0x3f
        const pid=getPID(id)
        if(pid!=data){
            return false
        }else{
            return true
        }
    }
    startSch(db: LDF, schName: string, activeMap: Record<string, boolean>, rIndex: number) {
        if (this.info.mode == LinMode.SLAVE) {
            return
        }

        if (this.sch) {
            clearTimeout(this.sch.timer)
            if(this.sch.activeSchName!=schName){
                this.log.sendEvent(`schChanged, table ${schName} slot ${rIndex}`,getTsUs())
            }
            this.sch.lastActiveSchName = this.sch.activeSchName
            this.sch.lastActiveIndex = this.sch.activeIndex
         
        }
        let sch = db.schTables.find(s => s.name == schName)
        if(sch==undefined){
           
            if(schName=="Diagnostic (not found, self defined)"){
                const bytes = 8
                const baseTime = (bytes * 10 + 44) * (1 / db.global.LIN_speed)
                const maxFrameTime = baseTime * 1.4 // 考虑1.4倍的容差
                const getm = Math.ceil(maxFrameTime)
                const stubDiagSch:SchTable={
                    name: "Diagnostic (not found, self defined)",
                    entries: [
                        {
                            delay: getm,
                            isCommand: true,
                            name: "DiagnosticMasterReq"
                        },
                        {
                            delay: getm,
                            isCommand: true,
                            name: "DiagnosticSlaveResp"
                        }
                    ]
                }
                sch=stubDiagSch
            }
        }
        const entry = sch?.entries[rIndex]
        let nextDelay = 0
        if (sch&&entry) {

            

            if (activeMap[`${schName}-${rIndex}`] != false) {
                nextDelay = entry.delay;
                if (entry.isCommand) {
                    // 处理command帧
                    const data = Buffer.alloc(8, 0); // 默认8字节数据
                    let frameId = 0x3c; // Master request frame ID

                    switch (entry.name) {
                        case 'AssignNAD':
                            frameId = 0x3c;
                            data[0] = 0x06; // PCI
                            data[1] = 0xB0; // SID
                            break;

                        case 'ConditionalChangeNAD':
                            frameId = 0x3c;
                            data[0] = 0x06; // PCI
                            data[1] = 0xB3; // SID
                            break;

                        case 'DataDump':
                            frameId = 0x3c;
                            data[0] = 0x06; // PCI
                            data[1] = 0xB4; // SID
                            break;

                        case 'SaveConfiguration':
                            frameId = 0x3c;
                            data[0] = 0x06; // PCI
                            data[1] = 0xB6; // SID
                            break;

                        case 'AssignFrameIdRange':
                            frameId = 0x3c;
                            data[0] = 0x06; // PCI
                            data[1] = 0xB7; // SID
                            break;

                        case 'FreeFormat':
                            frameId = 0x3c;
                            data[0] = 0x06; // PCI
                            data[1] = 0xB2; // SID
                            break;

                        case 'AssignFrameId':
                            frameId = 0x3c;
                            data[0] = 0x06; // PCI
                            data[1] = 0xB1; // SID
                            break;

                        case 'DiagnosticMasterReq':
                            frameId = 0x3c;
                            // 让主机请求帧数据保持为0
                            break;

                        case 'DiagnosticSlaveResp':
                            frameId = 0x3d;
                            // 让从机响应帧数据保持为0
                            break;
                    }

                    this.write({
                        frameId: frameId,
                        data: data,
                        direction: LinDirection.SEND,
                        checksumType: LinChecksumType.CLASSIC,
                        name: entry.name
                    }).catch(() => {
                        null
                    })
                } else {
                    // 处理普通帧和Sporadic帧
                    let frame: Frame = db.frames[entry.name]
                    let frameId: number | undefined
                    let frameData: Buffer | undefined
                    let dir=LinDirection.RECV
                    let workNode=db.node.master.nodeName
                    // uncondition frame
                    if(frame){
                        if(frame.publishedBy==db.node.master.nodeName){
                            dir=LinDirection.SEND
                        }
                        for(const r of this.nodeList){
                            if(r.db.name==db.name && r.nodeName==frame.publishedBy){
                                dir=LinDirection.SEND
                                break
                            }
                        }
                    }
                    // 检查是否为事件触发帧
                    const eventFrame = db.eventTriggeredFrames[entry.name]
                    if (eventFrame) {
                        dir=LinDirection.RECV
                        frameId = eventFrame.frameId
                        //sub frame max len 
                        let maxLen = 0
                        eventFrame.frameNames.forEach(subFrameName => {
                            const subFrame = db.frames[subFrameName]
                            if (subFrame) {
                                if (subFrame.frameSize > maxLen) {
                                    maxLen = subFrame.frameSize
                                }
                            }
                        })
                        frameData = Buffer.alloc(maxLen + 1)
                        let sendCnt=0
                        for(const ff of eventFrame.frameNames){
                            const f=db.frames[ff]
                            if(f){
                                 for(const r of this.nodeList){
                                    if(r.db.name==db.name && r.nodeName==f.publishedBy){
                                        //check update 
                                        const hasUpdate = f.signals.some(signal => {
                                            const s = db.signals[signal.name]
                                            return s && s.update
                                        })
                                        //clear update flag

                                        if(hasUpdate){
                                            f.signals.forEach(signal => {
                                                const s = db.signals[signal.name]
                                                if (s) {
                                                    s.update = false
                                                }
                                            })
                                            if(sendCnt>0){
                                                workNode+=','+r.nodeName
                                            }else{
                                                workNode=r.nodeName
                                            }
                                            
                                            dir=LinDirection.SEND
                                            if(sendCnt>0){
                                                //two simulate node send, event frame collision
                                                const last=frameData[0]
                                                const newPID=getPID(f.id)
                                                //bit and, 每一个bit AND操作，如果有一个为0，则结果为0，否则为1
                                                frameData[0]=last & newPID
                                            }else{
                                                frameData[0]=getPID(f.id)
                                            }
                                            sendCnt++
                                            const dd=getFrameData(db,f)
                                            dd.copy(frameData,1)
                                        }
                                     
                                        break
                                    }
                                }
                            }
                        }
                        if(sendCnt>1){
                            //two simulate node send, event frame collision

                        }
                      
                    }
                    // 如果是Sporadic帧
                    else if (!frame && db.sporadicFrames[entry.name]) {
                        const sporadicFrame = db.sporadicFrames[entry.name]
                        // 获取第一个有更新的frame
                        for (const frameName of sporadicFrame.frameNames) {
                            const f = db.frames[frameName]
                            if (f) {
                                // 检查是否有信号更新
                                const hasUpdate = f.signals.some(signal => {
                                    const s = db.signals[signal.name]
                                    return s && s.update
                                })
                                if (hasUpdate) {
                                    // 清除更新标志
                                    f.signals.forEach(signal => {
                                        const s = db.signals[signal.name]
                                        if (s) {
                                            s.update = false
                                        }
                                    })
                                    frame = f
                                    break
                                }
                            }
                        }
                    }

                    if ((frameId || frame?.id) && (frame || eventFrame)) {
                        const data = frameData || getFrameData(db, frame)
                        const id = frameId || frame.id
                        const checksum = (id == 0x3 || id == 0x3d) ? LinChecksumType.CLASSIC : LinChecksumType.ENHANCED
                     
                        this.write({
                            frameId: id,
                            data: data,
                            direction: dir,
                            checksumType: checksum,
                            database: db.name,
                            workNode: workNode,
                            name: eventFrame ? eventFrame.name : frame.name,
                            isEvent: eventFrame ? true : false
                        }).catch(() => {
                            null
                        })
                    }
                }
            }

            // 设置下一个调度
            const nextIndex = (rIndex + 1) % sch.entries.length
            const lastActiveSchName = this.sch?.activeSchName||schName
            this.sch = {
                activeSchName: schName,
                timer: setTimeout(() => {
                    this.startSch(db, schName, activeMap, nextIndex)
                }, nextDelay),
                activeIndex: nextIndex,
                lastActiveSchName: lastActiveSchName,
                lastActiveIndex: rIndex
            }
        }

    }
}