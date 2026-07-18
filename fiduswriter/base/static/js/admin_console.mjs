import {AdminConsole} from "@fiduswriter/frontend/admin_console"
import {initSettings} from "fwtoolkit/settings"

window.settings.gettext = window.gettext
window.settings.staticUrl = window.staticUrl
window.settings.interpolate = window.interpolate
initSettings(window.settings)

const theAdminConsole = new AdminConsole()

theAdminConsole.init()

window.theAdminConsole = theAdminConsole
