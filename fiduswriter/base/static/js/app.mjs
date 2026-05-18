import "regenerator-runtime/runtime.js" // For older browsers
import {App} from "./modules/app/index.js"

const theApp = new App(window.settings)
theApp.init()
window.theApp = theApp
