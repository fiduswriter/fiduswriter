import OfflinePluginRuntime from 'offline-plugin/runtime'

OfflinePluginRuntime.install()

import("./modules/app").then(({App}) => {
    const theApp = new App(window.fidusConfig)
    theApp.init()
    window.theApp = theApp
})
