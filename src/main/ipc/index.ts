import './odx'
import './dialog'
import './uds'
import './fs'
import './examples'
import { ipcMain, shell } from 'electron'
import { getCanVersion } from '../docan/can'


interface EcuBusPro {
    support: string[],
    vendor: Record<string, string[]>
}

ipcMain.handle('ipc-get-version', async (event, arg) => {
    const input = arg as EcuBusPro
    const list: {
        name: string,
        version: string
    }[] = []
    list.push({
        name: 'Electron',
        version: process.versions.electron
    })
    list.push({
        name: 'Chrome',
        version: process.versions.chrome
    })
    for (const v of input.support) {
        for (const vendor of input.vendor[v]) {
            list.push({
                name: `${vendor} ${v}`,
                version: getCanVersion(vendor)
            })
        }
    }
    return list
})

ipcMain.on('ipc-open-um', (event, arg) => {
    shell.openExternal('https://www.yuque.com/frankie-axwvu/mx7w4f')
})