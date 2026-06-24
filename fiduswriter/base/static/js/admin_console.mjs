import {AdminConsole} from "./modules/admin_console/index.js"
import {initSettings} from "fwtoolkit/settings.js"

initSettings(window.settings)

const theAdminConsole = new AdminConsole()

theAdminConsole.init()

window.theAdminConsole = theAdminConsole
