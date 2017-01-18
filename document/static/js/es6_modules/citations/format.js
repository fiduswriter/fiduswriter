import {citeprocSys} from "./citeproc-sys"
import {citationDefinitions} from "../style/citation-definitions"

/*
* Use CSL and bibDB to format all citations for the given prosemirror json citation nodes
*/
export class FormatCitations {
    constructor(allCitationInfos, citationStyle, bibDB) {
        this.allCitationInfos = allCitationInfos
        this.citationStyle = citationStyle
        this.bibDB = bibDB
    }

    init() {
        this.bibliography = false
        this.citations = []
        this.bibFormats = []
        this.citationTexts = []
        this.citationType = ''
        this.formatAllCitations()
        this.getFormattedCitations()
        return Promise.resolve()
    }

    formatAllCitations() {
        let that = this
        this.allCitationInfos.forEach(cInfo => {
            that.bibFormats.push(cInfo.format)
            that.citations.push({
                citationItems: cInfo.references,
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
        // Not all citations could be found in the database.
        // Reload the database, but not more than twice every 30 seconds.
        let llt = this.bibDB.lastLoadTimes
        let lltlen = this.bibDB.lastLoadTimes.length
        if (lltlen < 2 || Date.now() - llt[lltlen-2] > 30000) {
            this.bibDB.getDB().then(() => {
                if (missingItems.some(item => this.bibDB.db.hasOwnProperty(item))) {
                    this.init()
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
        let allIds = []
        this.citations.forEach(cit =>
            cit.citationItems.forEach(item => allIds.push('' + item.id))
        )
        citeprocInstance.updateItems(allIds)

        let inText = citeprocInstance.cslXml.dataObj.attrs.class === 'in-text'
        let len = this.citations.length
        for (let i = 0; i < len; i++) {
            let citation = this.citations[i],
                citationText = citeprocInstance.appendCitationCluster(citation, true)
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

                    if (items[j].prefix) {
                        onlyDateOption[0].prefix = items[j].prefix
                    }

                    if (0 < j) {
                        newCiteText += '; '
                    }
                    newCiteText += citeprocInstance.makeCitationCluster(onlyNameOption)
                    newCiteText += ' ' + citeprocInstance.makeCitationCluster(onlyDateOption)
                }
                citationText[0].push(newCiteText)
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
