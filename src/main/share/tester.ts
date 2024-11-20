import { HardwareType, Sequence, ServiceItem, UdsAddress, UdsInfo } from "./uds"
import { ServiceId } from "./service"



export interface TesterInfo {
  script?:string
  id:string
  name: string
  type:HardwareType
  udsTime:UdsInfo
  targetDeviceId?: string
  seqList: Sequence[]
  address:UdsAddress[]
  allServiceList: Partial<Record<ServiceId, ServiceItem[]>>
}
