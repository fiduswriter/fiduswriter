import {AdminConsole} from "./modules/admin_console"

const theAdminConsole = new AdminConsole(window.fidusConfig)

theAdminConsole.init()

window.theAdminConsole = theAdminConsole
