import { HardwareType, Sequence, ServiceItem, UdsAddress, UdsInfo, ServiceId } from './uds'
import { EntityAddr } from './doip'

export interface TesterInfo {
  script?: string
  id: string
  name: string
  type: HardwareType
  udsTime: UdsInfo
  targetDeviceId?: string
  seqList: Sequence[]
  address: UdsAddress[]
  allServiceList: Partial<Record<ServiceId, ServiceItem[]>>
}
