import {DocMaintenance} from "./modules/maintenance"

const theMaintainer = new DocMaintenance(window.fidusConfig)

theMaintainer.init()

window.theMaintainer = theMaintainer
