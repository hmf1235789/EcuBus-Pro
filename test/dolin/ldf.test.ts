import { test } from 'vitest'
import parse from '../../src/renderer/src/database/ldfParse'
import fs from 'fs'
import path from 'path'

test("ldf parse 2.2",()=>{
    const ldf=fs.readFileSync(path.join(__dirname,'2.2.ldf'),'utf-8')
    const r=parse(ldf)
   

})

test("ldf parse 2.1",()=>{
    const ldf=fs.readFileSync(path.join(__dirname,'2.1.ldf'),'utf-8')
    const r=parse(ldf)


})

test("ldf file1",()=>{
    const ldf=fs.readFileSync(path.join(__dirname,'file1.ldf'),'utf-8')
    const r=parse(ldf)
    // console.log(r)
})
test("ldf door",()=>{
    const ldf=fs.readFileSync(path.join(__dirname,'Door.ldf'),'utf-8')
    const r=parse(ldf)
    // console.log(r)
})

test("ldf t1",()=>{test
    const ldf=fs.readFileSync(path.join(__dirname,'t1.ldf'),'utf-8')
    const r=parse(ldf)
    // console.log(r)
})