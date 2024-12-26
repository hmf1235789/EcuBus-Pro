import type { CanInterAction, CanNode } from 'src/main/share/can';
import type { UdsDevice } from 'src/main/share/uds';
import type { TesterInfo } from 'src/main/share/tester';
import type { EthNode } from 'src/main/share/doip';
import type {LDF} from 'src/renderer/src/database/ldfParse'
import type {LinNode} from 'src/main/share/lin'






export interface CanInter {
    type: 'can',
    id: string,
    name: string,
    devices: string[],
    action: CanInterAction[]
    database?: string
}

export interface LinInter {
    id: string,
    name: string,
    devices: string[],
    type: 'lin',
    action: any[],
    database?: string
}
export type Inter = CanInter | LinInter
export type NodeItem = CanNode | EthNode | LinNode

export interface DataSet {
    devices: Record<string, UdsDevice>
    tester: Record<string, TesterInfo>
    subFunction: Record<string, { name: string; subFunction: string }[]>
    nodes: Record<string, NodeItem>
    ia: Record<string, Inter>
    database:{
        lin:Record<string,LDF>
    }
}