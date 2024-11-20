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
  name: string
  desc?: string
  routeActiveTIme: number
  taType: 'physical' | 'functional'
  testerLogicalAddr: string
  ecuLogicalAddr: string
  vecu:{
    vin: string
    eid: string
    gid: string
    sendSync: boolean
  }
  virReqType:'unicast' | 'multicast'
  virReqAddr: string
}

export enum DoipResultEnum {
  DoIP_OK,
  DoIP_HDR_ERROR,
  DoIP_TIMEOUT_A,
  DoIP_UNKNOWN_SA,
  DoIP_INVALID_SA,
  DoIP_UNKNOWN_TA,
  DoIP_MESSAGE_TOO_LARGE,
  DoIP_OUT_OF_MEMORY,
  DoIP_TARGET_UNREACHABLE,
  DoIP_NO_LINK,
  DoIP_NO_SOCKET,
  DoIP_ERROR
}
