import Bowser from "bowser"

const MINIMUM_BROWSER_VERSIONS = {
    chrome: '>=66',
    safari: '>=11',
    msie: '>=15', // effectively none
    msedge: '>=15',
    firefox: '>=52'
}

// Verify that we are running on a current browser.
if (Bowser.getParser(window.navigator.userAgent).satisfies(MINIMUM_BROWSER_VERSIONS)) {
    window.location = '/api/browser_check/'
}
