import {ErrorHook} from "./modules/error_hook"

const theErrorHook = new ErrorHook()
theErrorHook.init()
window.theErrorHook = theErrorHook
