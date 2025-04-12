import { VarItem } from 'src/preload/data'
import { UdsDevice } from './uds'

export const MonitorVar: VarItem[] = [
  {
    type: 'system',
    id: 'EventLoopDelay.min',
    name: `EventLoopDelayMin`,
    parentId: 'EventLoopDelay',
    desc: 'Minimum event loop delay - lower values indicate better performance',
    value: {
      type: 'number',
      initValue: 0
    }
  },
  {
    type: 'system',
    id: 'EventLoopDelay.max',
    name: `EventLoopDelayMax`,
    desc: 'Maximum event loop delay - higher values indicate potential performance issues',
    parentId: 'EventLoopDelay',
    value: {
      type: 'number',
      initValue: 0
    }
  },
  {
    type: 'system',
    id: 'EventLoopDelay.avg',
    name: `EventLoopDelayAvg`,
    desc: 'Average event loop delay - a good balance between performance and stability',
    parentId: 'EventLoopDelay',
    value: {
      type: 'number',
      initValue: 0
    }
  }
]

export function getAllSysVar(devices: Record<string, UdsDevice>): VarItem[] {
  const list: VarItem[] = [
    {
      type: 'system',
      id: 'Statistics',
      name: `Statistics`
    }
  ]
  list.push(...MonitorVar)
  for (const device of Object.values(devices)) {
    const buslist = ['BusLoad', 'BusLoadMin', 'BusLoadMax', 'BusLoadAvg']
    if (device.type === 'can' && device.canDevice) {
      list.push({
        type: 'system',
        id: `Statistics.${device.canDevice.id}`,
        name: device.canDevice.name,
        parentId: 'Statistics'
      })
      for (const item of buslist) {
        list.push({
          type: 'system',
          id: `Statistics.${device.canDevice.id}.${item}`,
          name: `${item}`,
          parentId: `Statistics.${device.canDevice.id}`,
          value: {
            type: 'number',
            initValue: 0,
            min: 0,
            max: 100
          }
        })
      }
    }
  }
  //monitor var
  list.push({
    type: 'system',
    id: 'EventLoopDelay',
    name: `EventLoopDelay`
  })
  list.push(...MonitorVar)
  return list
}
