import {AdminRegisterJournals} from "./es6_modules/ojs"

let theJournalRegister = new AdminRegisterJournals()

theJournalRegister.init()

window.theJournalRegister = theJournalRegister
