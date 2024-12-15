



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

export enum LinMode{
    MASTER,
    SLAVE
}


export enum LinChecksumType {
    CLASSIC,
    ENHANCED
}