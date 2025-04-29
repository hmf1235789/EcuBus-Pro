import { setSignal } from 'ECB'
let val = 0
setInterval(() => {
  setSignal('Model3CAN.VCLEFT_liftgateLatchRequest', val++ % 5)
}, 1000)

Util.OnVar('tests.t1', ({ value }) => {
  console.log(`update ${value}`)
})
