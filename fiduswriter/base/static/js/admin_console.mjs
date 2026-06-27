import {initSettings} from "fwtoolkit/settings"
import {AdminConsole} from "./modules/admin_console/index.js"

window.settings.gettext = window.gettext
window.settings.staticUrl = window.staticUrl
window.settings.interpolate = window.interpolate
initSettings(window.settings)

const theAdminConsole = new AdminConsole()

theAdminConsole.init()

window.theAdminConsole = theAdminConsole
