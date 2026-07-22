import {ErrorHook} from "@fiduswriter/frontend/error_hook"
import {djangoApiConnectors} from "./modules/api_adapters/index.js"

const theErrorHook = new ErrorHook({apiConnectors: djangoApiConnectors})
theErrorHook.init()
window.theErrorHook = theErrorHook
