import {AdminConsole} from "@fiduswriter/frontend/admin_console"
import {initSettings} from "fwtoolkit/settings"
import {djangoApiConnectors} from "./modules/api_adapters/index.js"

window.settings.gettext = window.gettext
window.settings.staticUrl = window.staticUrl
window.settings.interpolate = window.interpolate
initSettings(window.settings)

const theAdminConsole = new AdminConsole({apiConnectors: djangoApiConnectors})

theAdminConsole.init()

window.theAdminConsole = theAdminConsole
