import {AdminConsole} from "./modules/admin_console"

const theAdminConsole = new AdminConsole()

theAdminConsole.init()

window.theAdminConsole = theAdminConsole
