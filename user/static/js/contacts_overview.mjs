import {ContactsOverview} from "./modules/contacts"

const theContactsOverview = new ContactsOverview(window.fidusConfig)
theContactsOverview.init()
window.theContactsOverview = theContactsOverview
