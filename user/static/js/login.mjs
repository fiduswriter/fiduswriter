import {LoginPage} from "./modules/login"

const theLoginPage = new LoginPage(window.fidusConfig)

theLoginPage.init()

window.theLoginPage = theLoginPage
