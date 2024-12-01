import path from "path";
import fs from 'fs';
import { CanAddr, CanBase, CanMessage, CanNode, swapAddr } from "../share/can";
import { TesterInfo } from "../share/tester";
import UdsTester from "../workerClient";

import { UdsLOG } from "../log";
import { applyBuffer, getRxPdu, getTxPdu, ServiceItem } from "../share/uds";
import { findService } from "../docan/uds";
import { cloneDeep } from "lodash";
import { DOIP, DOIP_SOCKET, DoipError } from "../doip";
import { EthBaseInfo, EthNode, VinInfo } from "../share/doip";







export class NodeEthItem {
  private pool?: UdsTester
  tester?: TesterInfo
  log?: UdsLOG
  freeEvent: { doip: DOIP, id: string, cb: (data: { data: Buffer, ts: number } | DoipError) => void }[] = []
  constructor(
    public nodeItem: EthNode,
    private doips: DOIP[],
    private ethBaseMap: Map<string, EthBaseInfo>,
    private projectPath: string,
    private projectName: string,
    testers: Record<string, TesterInfo>

  ) {

    if (nodeItem.script) {
      const outDir = path.join(this.projectPath, '.ScriptBuild')
      const scriptNameNoExt = path.basename(nodeItem.script, '.ts')
      const jsPath = path.join(outDir, scriptNameNoExt + '.js')
      if (fs.existsSync(jsPath)) {
        this.tester = cloneDeep(nodeItem.attachTester ? testers[nodeItem.attachTester] : undefined)
        this.log = new UdsLOG(`${nodeItem.name} ${path.basename(nodeItem.script)}`, this.tester?.id)
        this.pool = new UdsTester({
          PROJECT_ROOT: this.projectPath,
          PROJECT_NAME: this.projectName,
          MODE: 'node',
          NAME: nodeItem.name,
        }, jsPath, this.log, this.tester)
        this.pool.registerHandler('registerEthVirtualEntity', this.registerEthVirtualEntity.bind(this))

        if (this.tester && this.tester.address.length > 0) {
          for (const c of nodeItem.channel) {
            const device = this.ethBaseMap.get(c)
            if (device) {
              const baseItem = this.doips.find(d => d.base.device.handle == device.device.handle)
              if (baseItem) {
                for (const addr of this.tester.address) {
                  if (addr.type == 'eth' && addr.ethAddr) {
                    const idT = baseItem.getId(addr.ethAddr, 'client')
                    const cbT = (data: { data: Buffer, ts: number } | DoipError) => {
                      console.log('xxxx',data)
                      if (data instanceof DoipError) {
                        //TODO:
                      } else {
                        if (this.tester) {
                          const item = findService(this.tester, data.data, true)
                          if (item) {
                            try {
                              applyBuffer(item, data.data, true)
                              this.pool?.triggerSend(item, data.ts).catch(e => {

                                this.log?.scriptMsg(e.toString(), data.ts, 'error');
                              })
                            } catch (e: any) {

                              this.log?.scriptMsg(e.toString(), data.ts, 'error');
                            }
                          }

                        }
                      }
                    }
                    baseItem.event.on(idT, cbT)
                    this.freeEvent.push({ doip: baseItem, id: idT, cb: cbT })

                    const idR = baseItem.getId(addr.ethAddr, 'server')
                    const cbR = (data: { data: Buffer, ts: number } | DoipError) => {
                      console.log('xxxx',data)
                      if (data instanceof DoipError) {
                        //TODO:
                      } else {

                        if (this.tester) {
                          const item = findService(this.tester, data.data, false)
                          if (item) {
                            try {
                              applyBuffer(item, data.data, false)
                              this.pool?.triggerRecv(item, data.ts).catch(e => {

                                this.log?.scriptMsg(e.toString(), data.ts, 'error');
                              })
                            } catch (e: any) {

                              this.log?.scriptMsg(e.toString(), data.ts, 'error');
                            }
                          }
                        }
                      }
                    }
                    baseItem.event.on(idR, cbR)
                    this.freeEvent.push({ doip: baseItem, id: idR, cb: cbR })
                  }
                }

              }
            }
          }
        }
      }
    }

  }
  async registerEthVirtualEntity(pool: UdsTester, data: {
    ip?: string,
    entity: VinInfo
  }) {
    let target = this.nodeItem.channel[0]
    if (data.ip) {
      target = data.ip
    }
    const baseItem = this.doips.find(d => d.base.device.handle == target)
    if (baseItem) {
      await baseItem.registerEntity(data.entity,true,this.log)
    }
  }
  close() {
    for (const e of this.freeEvent) {
      e.doip.event.removeListener(e.id, e.cb)
    }
    this.pool?.stop()


  }
  async start() {


    this.pool?.updateTs(0)
    await this.pool?.start(this.projectPath)

  }
}