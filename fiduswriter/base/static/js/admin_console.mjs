import {AdminConsole} from "./modules/admin_console/index.js"

const theAdminConsole = new AdminConsole(window.settings)

theAdminConsole.init()

window.theAdminConsole = theAdminConsole
