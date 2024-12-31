import { EventEmitter } from "stream"
import { CanVendor } from "./can"
import { Frame, LDF } from "src/renderer/src/database/ldfParse"
import { isEqual } from "lodash"



// export type LinVendor = 'peak'
export interface LinDevice {
    label: string
    id: string
    handle: any
    busy?: boolean
}


export interface LinBaseInfo {
    id: string
    device: LinDevice
    baudRate: number
    mode: LinMode
    vendor: CanVendor
    name: string
}


export interface LinNode {
    type: 'lin'
    disabled?: boolean
    id: string
    name: string
    channel: string[]
    script?: string
    attachTester?: string
    database?: string
    workNode?: string
}


export enum LinDirection {
    SEND,
    RECV,
    RECV_AUTO_LEN
}

export enum LinMode {
    MASTER = 'MASTER',
    SLAVE = 'SLAVE'
}


export enum LinChecksumType {
    CLASSIC,
    ENHANCED
}



export enum LIN_ERROR_ID {
    LIN_BUS_ERROR,
    LIN_READ_TIMEOUT,
    LIN_BUS_BUSY,
    LIN_BUS_CLOSED,
    LIN_INTERNAL_ERROR,
    LIN_PARAM_ERROR,
}

const linErrorMap: Record<LIN_ERROR_ID, string> = {
    [LIN_ERROR_ID.LIN_BUS_ERROR]: 'bus error',
    [LIN_ERROR_ID.LIN_READ_TIMEOUT]: 'read timeout',
    [LIN_ERROR_ID.LIN_BUS_BUSY]: 'bus busy',
    [LIN_ERROR_ID.LIN_INTERNAL_ERROR]: 'dll lib internal error',
    [LIN_ERROR_ID.LIN_BUS_CLOSED]: 'bus closed',
    [LIN_ERROR_ID.LIN_PARAM_ERROR]: 'param error'

}

export interface LinMsg {
    frameId: number
    data: Buffer
    direction: LinDirection
    checksumType: LinChecksumType
    checksum?: number
    database?: LDF
    workNode?: string
    name?: string
    isEvent?: boolean
}

export class LinError extends Error {
    errorId: LIN_ERROR_ID
    msgType?: LinMsg

    constructor(errorId: LIN_ERROR_ID, msg?: LinMsg, extMsg?: string) {
        super(linErrorMap[errorId] + (extMsg ? `,${extMsg}` : ''));
        this.errorId = errorId;
        this.msgType = msg

    }
}

const LinPidTable =
    [
        0x80, 0xC1, 0x42, 0x03, 0xC4, 0x85, 0x06, 0x47,
        0x08, 0x49, 0xCA, 0x8B, 0x4C, 0x0D, 0x8E, 0xCF,
        0x50, 0x11, 0x92, 0xD3, 0x14, 0x55, 0xD6, 0x97,
        0xD8, 0x99, 0x1A, 0x5B, 0x9C, 0xDD, 0x5E, 0x1F,
        0x20, 0x61, 0xE2, 0xA3, 0x64, 0x25, 0xA6, 0xE7,
        0xA8, 0xE9, 0x6A, 0x2B, 0xEC, 0xAD, 0x2E, 0x6F,
        0xF0, 0xB1, 0x32, 0x73, 0xB4, 0xF5, 0x76, 0x37,
        0x78, 0x39, 0xBA, 0xFB, 0x3C, 0x7D, 0xFE, 0xBF
    ]




export function getPID(frameId: number) {
    return LinPidTable[frameId]
}

export function getFrameData(db: LDF, frame: Frame): Buffer {
    const data = Buffer.alloc(frame.frameSize)
    
    for (const signal of frame.signals) {
        const signalDef = db.signals[signal.name]
        if (!signalDef) continue

        const byteOffset = Math.floor(signal.offset / 8)
        const bitOffset = signal.offset % 8

        if (signalDef.singleType === 'ByteArray') {
            // Handle byte array type signals
            const initValues = (signalDef.value!=undefined?signalDef.value:signalDef.initValue) as number[]
            const bytesToCopy = Math.ceil(signalDef.signalSizeBits / 8)
            
            if (bitOffset === 0) {
                // Aligned byte copy
                for (let i = 0; i < bytesToCopy && i < initValues.length; i++) {
                    data[byteOffset + i] = initValues[i]
                }
            } else {
                // Unaligned byte copy
                let remainingBits = signalDef.signalSizeBits
                for (let i = 0; i < bytesToCopy && i < initValues.length; i++) {
                    const value = initValues[i]
                    const bitsInThisByte = Math.min(8 - bitOffset, remainingBits)
                    
                    // Clear the target bits first
                    const mask = ~(((1 << bitsInThisByte) - 1) << bitOffset)
                    data[byteOffset + i] &= mask
                    
                    // Set the new bits
                    data[byteOffset + i] |= (value << bitOffset) & 0xFF
                    
                    // Handle bits that overflow to next byte
                    if (bitOffset + bitsInThisByte > 8 && byteOffset + i + 1 < data.length) {
                        const overflowBits = value >> (8 - bitOffset)
                        data[byteOffset + i + 1] = overflowBits & 0xFF
                    }
                    
                    remainingBits -= bitsInThisByte
                }
            }
        } else {
            // Handle scalar type signals
            const initValue = (signalDef.value!=undefined?signalDef.value:signalDef.initValue) as number
            const bitsToWrite = signalDef.signalSizeBits

            if (bitsToWrite <= 8) {
                // Fits in one byte
                const mask = ((1 << bitsToWrite) - 1) << bitOffset
                const value = (initValue << bitOffset) & mask
                data[byteOffset] &= ~mask // Clear bits
                data[byteOffset] |= value // Set new value
                
                // Handle overflow to next byte
                if (bitOffset + bitsToWrite > 8 && byteOffset + 1 < data.length) {
                    const overflowBits = initValue >> (8 - bitOffset)
                    data[byteOffset + 1] = overflowBits & 0xFF
                }
            } else {
                // Signal spans multiple bytes
                let remainingBits = bitsToWrite
                const valueToWrite = initValue
                
                while (remainingBits > 0) {
                    const currentByte = byteOffset + Math.floor((bitsToWrite - remainingBits) / 8)
                    const currentBitOffset = (signal.offset + (bitsToWrite - remainingBits)) % 8
                    const bitsInThisByte = Math.min(8 - currentBitOffset, remainingBits)
                    const mask =  ((1 << bitsInThisByte) - 1) << currentBitOffset;
                    const value = ((valueToWrite >> (remainingBits - bitsInThisByte)) << currentBitOffset) & mask
                    
                    if (currentByte < data.length) {
                        data[currentByte] &= ~mask
                        data[currentByte] |= value
                    }
                    
                    remainingBits -= bitsInThisByte
                }
            }
        }
    }
    return data
}