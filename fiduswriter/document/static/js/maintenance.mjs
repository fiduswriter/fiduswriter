import {DocMaintenance} from "@fiduswriter/frontend/maintenance"
import {initSettings} from "fwtoolkit/settings"

window.settings.gettext = window.gettext
window.settings.staticUrl = window.staticUrl
window.settings.interpolate = window.interpolate
initSettings(window.settings)

const theMaintainer = new DocMaintenance()

theMaintainer.init()

window.theMaintainer = theMaintainer
