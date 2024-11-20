const OSS = require('ali-oss');
const path=require('path')
const fsP = require('fs').promises
const sw = new OSS({
    region: 'oss-cn-chengdu',
    accessKeyId: process.env.ALIYUN_ACCESS_KEY_ID,
    accessKeySecret: process.env.ALIYUN_ACCESS_KEY_SECRET,
    bucket: 'ecubus'
});

const yml = require('yaml')



async function put() {
    // tag need match v\d+\.\d+\.\d+$
    

 
  
    const releasePath = path.join(__dirname, 'releases_note.md')
    await sw.put('app/releases_note.md', releasePath);
    console.log('releases_note.md pushed ok')
    
    const yamlPath = path.join(__dirname, '..', 'dist', 'latest.yml')
    await sw.put(`app/latest.yml`, yamlPath);
    console.log('latest.yml pushed ok')

    //read yaml
    const content=await fsP.readFile(yamlPath,'utf-8')
    const yaml = yml.parse(content)

    const version = yaml.version
    const options = {
        partSize: 1000 * 1024,//设置分片大小
        timeout: 120000,//设置超时时间
      };
    const exePath = path.join(__dirname, '..', 'dist', `EcuBus-Pro ${version}.exe`)

    await sw.multipartUpload(`app/EcuBus-Pro ${version}.exe`, exePath, options);
    console.log('EcuBus-Pro.exe pushed ok')

    //symbol link
    //await sw.putSymlink(`app/EcuBus-Pro.exe`, `app/EcuBus-Pro ${version}.exe`);
    
    const blockPath = path.join(__dirname, '..', 'dist', `EcuBus-Pro ${version}.exe.blockmap`)
    await sw.put(`app/EcuBus-Pro ${version}.exe.blockmap`, blockPath);
    console.log('EcuBus-Pro.exe.blockmap pushed ok')

    

    

    process.exit(0)
}

put()