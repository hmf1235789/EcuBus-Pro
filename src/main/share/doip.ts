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
  name:string
  entity:EntityAddr
  tester:TesterAddr
}

export interface TesterAddr{
  routeActiveTime: number
  createConnectDelay: number
  testerLogicalAddr: number
}


export interface EthNode{
  type:'eth'
  disabled?:boolean
  id:string
  name:string
  channel:string[]
  script?:string
  attachTester?:string
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
  taType: 'physical' | 'functional'
  nodeType?:'node'|'gateway'
  ta?: string
  ip?: string
  mcts?: number
  ncts?: number
  mds?: number
  powerMode?: number
  localPort?: number
  sendSync?: boolean
  udpLocalPort?: number

  virReqType:'unicast'|'omit'|'broadcast'|'multicast'
  virReqAddr: string
  entityNotFoundBehavior?: 'no' | 'normal' | 'withVin' | 'withEid' | 'forceNormal' | 'forceWithVin' | 'forceWithEid'
}
