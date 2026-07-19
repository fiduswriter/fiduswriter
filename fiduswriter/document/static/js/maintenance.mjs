import {DocMaintenance} from "@fiduswriter/frontend/maintenance"
import {initSettings} from "fwtoolkit/settings"
import {djangoApiConnectors} from "../../base/static/js/modules/api_adapters/index.js"

window.settings.gettext = window.gettext
window.settings.staticUrl = window.staticUrl
window.settings.interpolate = window.interpolate
initSettings(window.settings)

const theMaintainer = new DocMaintenance({apiConnectors: djangoApiConnectors})

theMaintainer.init()

window.theMaintainer = theMaintainer
