import { LinMsg } from 'nodeCan/lin'
import { Frame, LDF, SignalEncodeType } from '../ldfParse'

export function getPhysicalValue(
  rawValue: number,
  encodingType: SignalEncodeType['encodingTypes'][0],
  db: LDF
): number {
  const { minValue, maxValue, scale, offset } = encodingType.physicalValue!
  // Check if raw value is within the valid range (min to max)
  if (rawValue >= minValue && rawValue <= maxValue) {
    // Apply the physical value calculation formula
    return scale * rawValue + offset
  }
  return rawValue
}

export function writeMessageData(frame: Frame, data: Buffer, db: LDF) {
  for (const signal of frame.signals) {
    // Find signal definition
    const signalDef = db.signals[signal.name]
    if (!signalDef) continue

    // Calculate signal value from raw data
    let value: number | string = 0
    const startBit = signal.offset
    const length = signalDef.signalSizeBits

    if (signalDef.singleType === 'ByteArray') {
      // Handle byte array type signals
      const startByte = Math.floor(startBit / 8)
      const byteLength = Math.ceil(length / 8)
      const bitOffset = startBit % 8

      if (bitOffset === 0) {
        // 如果是字节对齐的情况
        const tempBuffer = Buffer.alloc(8)
        for (let i = 0; i < byteLength && startByte + i < data.length; i++) {
          tempBuffer[i] = data[startByte + i]
        }

        if (length <= 8) {
          value = tempBuffer[0]
        } else if (length <= 16) {
          value = tempBuffer.readUInt16BE(0)
        } else if (length <= 24) {
          value = (tempBuffer.readUInt16BE(0) << 8) | tempBuffer[2]
        } else if (length <= 32) {
          value = tempBuffer.readUInt32BE(0)
        } else {
          // 超过32位用16进制字符串表示
          value = tempBuffer.subarray(0, byteLength).toString('hex')
          signalDef.value = Array.prototype.slice.call(tempBuffer.subarray(0, byteLength), 0)
        }
      } else {
        // 非字节对齐的情况
        let tempBuffer = Buffer.alloc(8)
        for (let i = 0; i < byteLength && startByte + i < data.length; i++) {
          const currentByte = data[startByte + i]
          const nextByte = startByte + i + 1 < data.length ? data[startByte + i + 1] : 0

          // 组合当前字节和下一个字节的bits
          tempBuffer[i] = ((currentByte >> bitOffset) | (nextByte << (8 - bitOffset))) & 0xff
        }
        //截断
        tempBuffer = tempBuffer.subarray(0, byteLength)
        //反转
        tempBuffer = tempBuffer.reverse()
        if (length <= 8) {
          value = tempBuffer[0]
        } else if (length <= 16) {
          value = tempBuffer.readUInt16BE(0)
        } else if (length <= 24) {
          value = (tempBuffer.readUInt16BE(0) << 8) | tempBuffer[2]
        } else if (length <= 32) {
          value = tempBuffer.readUInt32BE(0)
        } else {
          // 超过32位用16进制字符串表示
          value = tempBuffer.subarray(0, byteLength).toString('hex')
          signalDef.value = Array.prototype.slice.call(tempBuffer.subarray(0, byteLength), 0)
        }
      }

      // 对于数字类型，需要清除多余的位
      if (typeof value === 'number') {
        const mask = (1 << length) - 1
        value &= mask
        signalDef.value = value
      }
      signalDef.physValue = value
    } else {
      // Handle scalar type signals - process bit by bit
      let tempValue = 0

      for (let i = 0; i < length; i++) {
        const targetBit = startBit + i
        const byteOffset = Math.floor(targetBit / 8)
        const bitOffset = targetBit % 8

        if (byteOffset < data.length) {
          // 获取对应位的值
          if ((data[byteOffset] & (1 << bitOffset)) !== 0) {
            tempValue |= 1 << i
          }
        }
      }
      signalDef.value = tempValue
      signalDef.physValue = tempValue
      //check enum
      for (const encodeKey of Object.keys(db.signalRep)) {
        if (db.signalRep[encodeKey].includes(signalDef.signalName)) {
          const encodeInfo = db.signalEncodeTypes[encodeKey]
          const isPhysicalValue = encodeInfo.encodingTypes.find(
            (type) => type.type === 'physicalValue'
          )
          if (isPhysicalValue) {
            signalDef.physValue = getPhysicalValue(tempValue, isPhysicalValue, db)
            signalDef.physValueEnum = `${signalDef.physValue}${isPhysicalValue.physicalValue?.textInfo || ''}`
            break
          }
          const isBcdValue = encodeInfo.encodingTypes.find((type) => type.type === 'bcdValue')
          if (isBcdValue) {
            //raw bcd 编码
            const bcdValue = tempValue
              .toString()
              .split('')
              .map(Number)
              .reduce((acc, digit) => (acc << 4) | digit, 0)
            signalDef.physValue = bcdValue
            break
          }
          const isAsciiValue = encodeInfo.encodingTypes.find((type) => type.type === 'asciiValue')
          if (isAsciiValue) {
            signalDef.physValue = tempValue.toString()
            break
          }
          for (const encodeType of encodeInfo.encodingTypes) {
            if (encodeType.logicalValue?.signalValue == tempValue) {
              signalDef.physValueEnum = encodeType.logicalValue?.textInfo
              break
            }
          }
          break
        }
      }
    }
  }
}
