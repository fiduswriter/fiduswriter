import {initSettings} from "./modules/common/settings.js"
import {DocMaintenance} from "./modules/maintenance/index.js"

initSettings(window.settings)

const theMaintainer = new DocMaintenance()

theMaintainer.init()

window.theMaintainer = theMaintainer
