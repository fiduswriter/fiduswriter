import {RegisterJournals} from "./es6_modules/ojs/register_journals"

let theJournalRegister = new RegisterJournals()

theJournalRegister.init()

window.theJournalRegister = theJournalRegister
