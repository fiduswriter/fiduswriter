import {ErrorHook} from "@fiduswriter/frontend/error_hook"

const theErrorHook = new ErrorHook()
theErrorHook.init()
window.theErrorHook = theErrorHook
