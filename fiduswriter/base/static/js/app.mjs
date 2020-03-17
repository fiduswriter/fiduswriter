import {App} from "./modules/app"

const theApp = new App()
theApp.init()
window.theApp = theApp
window.isOnline = () => {
  if(window.theApp !== undefined && window.theApp.ws !== undefined && window.theApp.ws.ws.readyState!=0 && !window.theApp.ws.connected){
    return false
  } else {
    return true
  }
}
