import {ImageOverview} from "./modules/images/overview"

const theImageOverview = new ImageOverview(window.fidusConfig)
theImageOverview.init()

window.theImageOverview = theImageOverview
