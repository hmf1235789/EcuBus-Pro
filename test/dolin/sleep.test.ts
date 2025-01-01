
import Delay from "src/main/dolin/delay";
import { test,describe,it} from "vitest";
import { getTsUs } from "src/main/share/can";
import EventEmitter from "events";




const loading=()=>{
    const event = new EventEmitter()
    event.on('loading',()=>{
        // console.log('loading')
    })
    for(let i=0;i<8;i++){
        event.on('loading',()=>{
            // console.log('loading')
        })
        event.on('loading1',()=>{
            // console.log('loading')
        })
        event.on('loading2',()=>{
            // console.log('loading')
        })
    }
    const delay=setInterval(() => {
        event.emit('loading')
        event.emit('loading1')
        event.emit('loading2')
        for(let i=0;i<10000000;i++){
            event.emit(`loading`)
        }
    }, 1);
    setTimeout(() => {
        clearInterval(delay)
    }, 20);

}


const jsDelay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))   

describe('delay', () => {
    it('delay1', async () => {
        // loading()
        const t1=getTsUs()
        await jsDelay(10)
        //增加一些系统负载，让延时更明显
        const t2=getTsUs()
        console.log((t2-t1)/1000)
    }),
    test('delay2', async () => {
        // loading()
        const delay = new Delay()
        const t1=getTsUs()
        await delay.delay(10)
        const t2=getTsUs()
        console.log((t2-t1)/1000)
        delay.close()
    })
})