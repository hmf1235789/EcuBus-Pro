



export interface LinDevice {
    label: string
    id: string
    handle: any
    busy?: boolean
}


export enum LinDirection {
    SEND,
    RECV
}


export enum LinChecksumType {
    CLASSIC,
    ENHANCED
}