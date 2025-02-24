import { DiagResponse, RegisterEthVirtualEntity } from 'ECB'

Util.Init(async () => {
  console.log('Registering virtual entity')
  await RegisterEthVirtualEntity(
    {
      vin: '123456789',
      eid: '00-00-00-00-00-00',
      gid: '00-00-00-00-00-00',
      logicalAddr: 100
    },
    '127.0.0.1'
  )
})

Util.On('Tester_eth_1.DiagnosticSessionControl160.send', async (req) => {
  console.log('Received Diag request')
  const resp = DiagResponse.fromDiagRequest(req)
  await resp.outputDiag()
})
