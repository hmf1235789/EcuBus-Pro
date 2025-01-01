import { EventTriggeredFrame, Frame, LDF } from "src/renderer/src/database/ldfParse"
import { getFrameData, LinBaseInfo, LinChecksumType, LinDevice, LinDirection, LinMode, LinMsg } from "../share/lin"
import EventEmitter from "events"

export default abstract class LinBase {

    sch?: {
        activeSchName: string,
        timer: NodeJS.Timeout,
        activeIndex: number,
        lastActiveSchName: string
        lastActiveIndex: number
    }
    abstract info:LinBaseInfo
    nodeList: {
        db: LDF,
        nodeName: string
    }[] = []
    constructor(public mode: LinMode) {

    }
    abstract event: EventEmitter
    static getValidDevices(): LinDevice[] {
        throw new Error('Method not implemented.')
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
    startSch(db: LDF, schName: string, activeMap: Record<string, boolean>, rIndex: number) {
        if (this.mode == LinMode.SLAVE) {
            return
        }
       
        if (this.sch) {
            clearTimeout(this.sch.timer)
            this.sch.lastActiveSchName = this.sch.activeSchName
            this.sch.lastActiveIndex = this.sch.activeIndex
        }
        const sch = db.schTables.find(s => s.name == schName)
        const entry = sch?.entries[rIndex]
        let nextDelay = 0
        if (entry) {


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

                    // 检查是否为事件触发帧
                    const eventFrame = db.eventTriggeredFrames[entry.name]
                    if (eventFrame) {

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
                        const dir = eventFrame ? LinDirection.RECV : (frame.publishedBy === db.node.master.nodeName ? LinDirection.SEND : LinDirection.RECV)
                        this.write({
                            frameId: id,
                            data: data,
                            direction: dir,
                            checksumType: checksum,
                            database: db,
                            workNode: db.node.master.nodeName,
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
            this.sch = {
                activeSchName: schName,
                timer: setTimeout(() => {
                    this.startSch(db, schName, activeMap, nextIndex)
                }, nextDelay),
                activeIndex: nextIndex,
                lastActiveSchName: schName,
                lastActiveIndex: rIndex
            }
        }
       
    }
}