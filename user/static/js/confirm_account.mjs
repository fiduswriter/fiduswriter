import {ConfirmAccount} from "./modules/profile/confirm_account"

window.theAccountConfirmer = new ConfirmAccount(window.confirmationData, window.testServer)
theAccountConfirmer.init()
