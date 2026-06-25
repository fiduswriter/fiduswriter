import {initSettings} from "fwtoolkit/settings"
import {AdminConsole} from "./modules/admin_console/index.js"

initSettings(window.settings)

const theAdminConsole = new AdminConsole()

theAdminConsole.init()

window.theAdminConsole = theAdminConsole
