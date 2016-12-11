import {citeprocSys} from "./citeproc-sys"
import {citationDefinitions} from "../style/citation-definitions"

/*
* Use CSL and bibDB to format all citations for the given prosemirror json citation nodes
*/
export class FormatCitations {
    constructor(allCitationInfos, citationStyle, bibDB, callback) {
        this.allCitationInfos = allCitationInfos
        this.citationStyle = citationStyle
        this.bibDB = bibDB
        this.callback = callback
    }

    init() {
        this.bibliographyHTML = ''
        this.citations = []
        this.bibFormats = []
        this.citationTexts = []
        this.citationType = ''
        this.bibliography = ''
        if (this.formatAllCitations()) {
            this.getFormattedCitations()
            this.formatBibliography()
            this.callback()
        }
    }

    formatAllCitations() {
        let that = this
        let foundAll = this.allCitationInfos.every(function(cInfo) {
            var entries = cInfo.bibEntry ? cInfo.bibEntry.split(',') : []
            let missingCitationKey = false // Whether all citation entries are in the database
            let len = entries.length
            for (let j = 0; j < len; j++) {
                if (that.bibDB.db.hasOwnProperty(entries[j])) {
                    continue
                }
                missingCitationKey = entries[j]
                break
            }

            if (missingCitationKey === false) {
                let pages = cInfo.bibPage ? cInfo.bibPage.split(',,,') : [],
                    prefixes = cInfo.bibBefore ? cInfo.bibBefore.split(',,,') : [],
                    citationItem,
                    citationItems = []
                for (let j = 0; j < len; j++) {
                    citationItem = {
                        id: entries[j]
                    }
                    if ('' !== pages[j]) {
                        citationItem.locator = pages[j]
                    }
                    if ('' !== prefixes[j]) {
                        citationItem.prefix = prefixes[j]
                    }
                    citationItems.push(citationItem)
                }
                that.bibFormats.push(cInfo.bibFormat)
                that.citations.push({
                    citationItems,
                    properties: {
                        noteIndex: that.bibFormats.length
                    }
                })
            } else {
                // Not all citations could be found in the database.
                // Reload the database, but not more than twice every 30 seconds.
                let llt = that.bibDB.lastLoadTimes
                let lltlen = that.bibDB.lastLoadTimes.length
                if (lltlen < 2 || Date.now() - llt[lltlen-2] > 30000) {
                    that.bibDB.getDB(function(){
                        if (that.bibDB.db.hasOwnProperty(missingCitationKey)) {
                            that.init()
                        } else {
                            // The missing key was not in the update from the server
                            // so it seems like this document is containing old
                            // citation keys. Do not attempt further reloads.
                            that.bibDB.allowReload = false
                        }
                    })
                    return false
                }
            }
            return true
        })
        return foundAll
    }

    formatBibliography() {
        this.bibliographyHTML += '<h1 class="article-bibliography-header"></h1>'
        // Add entry to bibliography
        for (let j = 0; j < this.bibliography[1].length; j++) {
            this.bibliographyHTML += this.bibliography[1][j]
        }
    }

    getFormattedCitations() {
        if (citationDefinitions.styles.hasOwnProperty(this.citationStyle)) {
            this.citationStyle = citationDefinitions.styles[this.citationStyle]
        } else {
            for (let styleName in citationDefinitions.styles) {
                this.citationStyle = citationDefinitions.styles[styleName]
                break
            }
        }

        let citeprocInstance = new CSL.Engine(
            new citeprocSys(this.bibDB),
            this.citationStyle.definition
        )
        let inText = citeprocInstance.cslXml.dataObj.attrs.class === 'in-text'
        let len = this.citations.length

        for (let i = 0; i < len; i++) {
            let citation = this.citations[i],
                citationText = citeprocInstance.appendCitationCluster(citation)

            if (inText && 'textcite' == this.bibFormats[i]) {
                let newCiteText = '',
                    items = citation.citationItems,
                    len2 = items.length

                for (let j = 0; j < len2; j++) {
                    let onlyNameOption = [{
                        id: items[j].id,
                        "author-only": 1
                    }]

                    let onlyDateOption = [{
                        id: items[j].id,
                        "suppress-author": 1
                    }]

                    if (items[j].locator) {
                        onlyDateOption[0].locator = items[j].locator
                    }

                    if (items[j].label) {
                        onlyDateOption[0].label = items[j].label
                    }

                    if (items[j].prefix) {
                        onlyDateOption[0].prefix = items[j].prefix
                    }

                    if (items[j].suffix) {
                        onlyDateOption[0].suffix = items[j].suffix
                    }

                    if (0 < j) {
                        newCiteText += '; '
                    }
                    newCiteText += citeprocInstance.makeCitationCluster(onlyNameOption)
                    newCiteText += ' ' + citeprocInstance.makeCitationCluster(onlyDateOption)
                }
                citationText[0][1] = newCiteText
            }
            this.citationTexts.push(citationText)
        }
        this.citationType = citeprocInstance.cslXml.dataObj.attrs.class
        this.bibliography = citeprocInstance.makeBibliography()
    }
}
