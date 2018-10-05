import {Profile} from "./modules/profile"

const theProfile = new Profile(window.fidusConfig)

theProfile.init()

window.theProfile = theProfile
