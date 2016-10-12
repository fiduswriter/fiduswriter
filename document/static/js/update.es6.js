import {UpdateAllDocs} from "./es6_modules/documents/update"

let theUpdater = new UpdateAllDocs()

theUpdater.init()

window.theUpdater = theUpdater
