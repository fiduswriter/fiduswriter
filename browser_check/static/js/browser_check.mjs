import bowser from "bowser"

const MINIMUM_BROWSER_VERSIONS = {
    msedge: '15',
    msie: '15', // effectively none
    firefox: '52',
    chrome: '66',
    safari: '11'
}

// Verify that we are running on a current browser.
if (bowser.isUnsupportedBrowser(MINIMUM_BROWSER_VERSIONS, true, window.navigator.userAgent)) {
    window.location = '/browser_check/'
}
