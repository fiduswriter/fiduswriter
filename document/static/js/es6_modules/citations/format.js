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
        this.bibliography = false
        this.citations = []
        this.bibFormats = []
        this.citationTexts = []
        this.citationType = ''
        this.formatAllCitations()
        this.getFormattedCitations()
        this.callback()
    }

    formatAllCitations() {
        let that = this
        this.allCitationInfos.forEach(function(cInfo) {
            var entries = cInfo.bibEntry ? cInfo.bibEntry.split(',') : []
            let len = entries.length

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
        })
    }

    get bibHTML() {
        // HTML
        let html = '', bib = this.bibliography
        html += '<h1 class="article-bibliography-header"></h1>'
        // Add entries to bibliography
        html += bib[0].bibstart + bib[1].join('') + bib[0].bibend
        return html
    }

        // CSS
    get bibCSS()  {
        let css = '\n', bibInfo = this.bibliography[0]
            css += `.csl-entry {margin-bottom: ${bibInfo.entryspacing+1}em;}\n`
            css += `.csl-bib-body {line-height: ${bibInfo.linespacing};}\n`
            if (bibInfo.hangingindent) {
                css += `
                    .csl-entry {
                        text-indent: -0.5in;
                        margin-left: 0.5in;
                    }\n`
            } else if(bibInfo["second-field-align"] === 'margin') {
                css += `
                    .csl-left-margin {
                        text-indent: -${bibInfo.maxoffset}ch;
                        width: ${bibInfo.maxoffset}ch;
                    }
                `
            } else if(bibInfo["second-field-align"] === 'flush') {
                css += `
                    .csl-left-margin {
                        width: ${bibInfo.maxoffset}ch;
                    }
                `
            }
        return css
    }

    reloadCitations(missingItems) {
        let that = this
        // Not all citations could be found in the database.
        // Reload the database, but not more than twice every 30 seconds.
        let llt = this.bibDB.lastLoadTimes
        let lltlen = this.bibDB.lastLoadTimes.length
        if (lltlen < 2 || Date.now() - llt[lltlen-2] > 30000) {
            this.bibDB.getDB(function(){
                if (missingItems.some(item=>{return that.bibDB.db.hasOwnProperty(item)})) {
                    that.init()
                }
            })
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
        let citeprocConnector = new citeprocSys(this.bibDB)
        let citeprocInstance = new CSL.Engine(
            citeprocConnector,
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

        if (citeprocConnector.missingItems.length > 0) {
            this.reloadCitations(citeprocConnector.missingItems)
        }
    }
}
