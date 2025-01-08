import { DiagResponse } from "ECB";



Util.On("Tester_lin_1.DiagnosticSessionControl160.send",async (v)=>{
    console.log("Tester_lin_1.DiagnosticSessionControl160.send")
    const resp=DiagResponse.fromDiagRequest(v)
    await resp.outputDiag()
})