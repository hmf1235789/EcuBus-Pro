import {NetworkInterfaceInfo} from 'os'

export interface EthDevice {
  label: string
  id: string
  handle: string
  detail?: NetworkInterfaceInfo
}

export interface EthBaseInfo {
  name: string
  device: EthDevice
  vendor: string
  id: string
}

export interface EthAddr {
  id:string
  name: string
  desc?: string
  routeActiveTime: number
  taType: 'physical' | 'functional'
  testerLogicalAddr: number
  virReqType:'unicast'|'omit'|'broadcast'|'multicast'
  virReqAddr: string
  entityNotFoundBehavior?: 'no' | 'normal' | 'withVin' | 'withEid' | 'forceNormal' | 'forceWithVin' | 'forceWithEid'
}

export interface VinInfo {
  vin: string,
  logicalAddr: number,
  eid: string,
  gid: string
  furtherAction?: number
  syncStatus?: number
}

export interface EntityAddr extends VinInfo {
  nodeType?:'node'|'gateway'
  ip?: string
  mcts?: number
  ncts?: number
  mds?: number
  powerMode?: number
  localPort?: number
  sendSync?: boolean
  udpLocalPort?: number
}
