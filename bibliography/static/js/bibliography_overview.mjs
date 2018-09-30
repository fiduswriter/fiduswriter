import {BibliographyOverview} from "./modules/bibliography/overview"

const theBibOverview = new BibliographyOverview(window.fidusConfig)
theBibOverview.init()

window.theBibOverview = theBibOverview
