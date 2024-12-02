import {RegisterEthVirtualEntity} from 'ECB'


UDS.Init(async () => {
    console.log('Registering virtual entity')
    await RegisterEthVirtualEntity('127.0.0.1',{
        vin:'123456789',
        eid:'00-00-00-00-00-00',
        gid:'00-00-00-00-00-00',
        logicalAddr:100
    })
})

UDS.On("Tester_eth_1.DiagnosticSessionControl160.send",()=>{
    console.log('DiagnosticSessionControl160 send')
})