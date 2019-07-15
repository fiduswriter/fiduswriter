import {App} from "./modules/app"

const theApp = new App(window.fidusConfig)

theApp.init()
window.theApp = theApp
