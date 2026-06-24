import {initSettings} from "fwtoolkit/settings"
import {DocMaintenance} from "./modules/maintenance/index.js"

initSettings(window.settings)

const theMaintainer = new DocMaintenance()

theMaintainer.init()

window.theMaintainer = theMaintainer
