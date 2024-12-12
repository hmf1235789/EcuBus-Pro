/* eslint-disable no-var */
import { UDSClass,CanMessage} from './uds'

declare global {
    var UDS: UDSClass
    var OnKey: typeof UDSClass.prototype.OnKey
    var OffKey: typeof UDSClass.prototype.OffKey
    var OnCan: typeof UDSClass.prototype.OnCan
    var OffCan: typeof UDSClass.prototype.OffCan
}


export { }