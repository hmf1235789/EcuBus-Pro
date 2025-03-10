import { DiagJob, DiagRequest } from 'ECB'

let currentBlock: { addr: number; data: Buffer } | undefined = undefined
let maxChunkSize: number | undefined
Util.Init(() => {
  const testerName = Util.getTesterName()
  Util.Register(
    `${testerName}.RequestDownloadBin` as any,
    async function (
      dataFormatIdentifier,
      addressAndLengthFormatIdentifier,
      memoryAddress,
      binFile
    ) {
      const r34 = new DiagRequest(testerName, {
        id: '',
        name: '',
        serviceId: '0x34',
        // Service ID for RequestDownload
        params: [],
        respParams: []
      })
      const prefixBuffer = Buffer.from([
        52,
        dataFormatIdentifier & 255,
        addressAndLengthFormatIdentifier & 255
      ])
      const memoryAddressBuffer = Buffer.alloc(addressAndLengthFormatIdentifier & 15)
      for (let i = 0; i < memoryAddressBuffer.length; i++) {
        memoryAddressBuffer[i] = (memoryAddress >> (8 * (memoryAddressBuffer.length - 1 - i))) & 255
      }
      const memorySizeBuffer = Buffer.alloc((addressAndLengthFormatIdentifier & 240) >> 4)
      for (let i = 0; i < memorySizeBuffer.length; i++) {
        memorySizeBuffer[i] = (binFile.length >> (8 * (memorySizeBuffer.length - 1 - i))) & 255
      }
      let maxNumberOfBlockLength = 0
      r34.diagSetRaw(Buffer.concat([prefixBuffer, memoryAddressBuffer, memorySizeBuffer]))
      r34.On('recv', (resp) => {
        const data = resp.diagGetRaw()
        const lengthFormatIdentifier = (data[1] & 240) >> 4
        for (let i = 0; i < lengthFormatIdentifier; i++) {
          maxNumberOfBlockLength += data[2 + i] * Math.pow(256, lengthFormatIdentifier - i - 1)
        }
        maxChunkSize = maxNumberOfBlockLength
        currentBlock = {
          addr: memoryAddress,
          data: binFile
        }
      })
      const job = new DiagJob(testerName, {
        id: 'RequestDownloadBin_tmpJob',
        name: 'RequestDownloadBin_tmpJob',
        serviceId: 'Job',
        // Service ID for RequestDownload
        params: [],
        respParams: []
      })
      return [r34, job]
    }
  )
  Util.Register(`${testerName}.RequestDownloadBin_tmpJob` as any, () => {
    if (maxChunkSize == void 0 || maxChunkSize <= 2) {
      throw new Error('maxNumberOfBlockLength is undefined or too small')
    }
    if (currentBlock) {
      maxChunkSize -= 2
      if (maxChunkSize & 7) {
        maxChunkSize -= maxChunkSize & 7
      }
      const numChunks = Math.ceil(currentBlock.data.length / maxChunkSize)
      const list = []
      for (let i = 0; i < numChunks; i++) {
        const start = i * maxChunkSize
        const end = Math.min(start + maxChunkSize, currentBlock.data.length)
        const chunk = currentBlock.data.subarray(start, end)
        const r36 = new DiagRequest(testerName, {
          id: '',
          name: '',
          serviceId: '0x36',
          // Service ID for RequestDownload
          params: [],
          respParams: []
        })
        const blockSequenceCounter = Buffer.alloc(1)
        blockSequenceCounter.writeUInt8((i + 1) & 255)
        r36.diagSetRaw(Buffer.concat([Buffer.from([54]), blockSequenceCounter, chunk]))
        list.push(r36)
      }
      const r37 = new DiagRequest(testerName, {
        id: '',
        name: '',
        serviceId: '0x37',
        // Service ID for RequestDownload
        params: [],
        respParams: []
      })
      r37.diagSetRaw(Buffer.from([55]))
      list.push(r37)
      currentBlock = void 0
      maxChunkSize = void 0
      return list
    } else {
      return []
    }
  })
})
