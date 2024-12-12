/* eslint-disable no-var */
import type { Logger} from 'winston'
import type { EventEmitter } from 'events'
declare global {
    var sysLog: Logger
    var scriptLog: Logger
    var keyEvent: EventEmitter
  }
  