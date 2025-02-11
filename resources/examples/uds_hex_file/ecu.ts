import {DiagResponse} from 'ECB'



Util.Init(()=>{
    
})


Util.On('Tester.RequestDownload520.send', async (req)=>{
    console.log('Tester.RequestDownload520.send')
    const resp=DiagResponse.fromDiagRequest(req)
    resp.diagSetRaw(Buffer.from([0x74,0x40,0,0,0,0x81]))
    await resp.outputDiag()
})