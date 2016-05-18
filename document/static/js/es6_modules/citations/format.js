import {citeprocSys} from "./citeproc-sys"
import {CSLExporter} from "../bibliography/exporter/csl"
import {citationDefinitions} from "../style/citation-definitions"
/**
 * Functions to display citations and the bibliography.
 */

export class FormatCitations {
    constructor(contentElement, citationStyle, bibDB, renderNoteCitations = true) {
        this.contentElement = contentElement
        this.citationStyle = citationStyle
        this.bibDB = bibDB
        this.renderNoteCitations = renderNoteCitations
        this.bibliographyHTML = ''
        this.listedWorksCounter = 0
        this.citations = []
        this.bibFormats = []
        //this.citationIds = []
        this.citationTexts = []
        this.citationType = ''
        this.bibliography = ''
        this.allCitations = []
        this.cslDB = false
        this.init()
        this.formatAllCitations()
        this.getFormattedCitations()
        if (this.renderNoteCitations || 'note' !== this.citationType) {
            this.renderCitations()
        }
        this.renderBibliography()
    }

    init() {
        this.allCitations = jQuery(this.contentElement).find('.citation')
        let cslGetter = new CSLExporter(this.bibDB) // TODO: Figure out if this conversion should be done earlier and cached
        this.cslDB = cslGetter.cslDB
    }

    formatAllCitations() {
        let that = this
        this.allCitations.each(function(i) {
            var entries = this.dataset.bibEntry ? this.dataset.bibEntry.split(',') : []
            let allCitationsListed = true

            let len = entries.length
            for (let j = 0; j < len; j++) {
                if (that.bibDB.hasOwnProperty(entries[j])) {
                    continue
                }
                allCitationsListed = false
                break
            }

            if (allCitationsListed) {
                let pages = this.dataset.bibPage ? this.dataset.bibPage.split(',,,') : [],
                    prefixes = this.dataset.bibBefore ? this.dataset.bibBefore.split(',,,') : [],
                    //suffixes = this.dataset.bibAfter.split(',,,'),
                    citationItem,
                    citationItems = []

                that.listedWorksCounter += entries.length

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
                    //if('' != suffixes[j]) { citationItem.suffix = pages[j] }
                    citationItems.push(citationItem)
                }

    //            that.bibFormats.push(i)
                that.bibFormats.push(this.dataset.bibFormat)
                that.citations.push({
                    citationItems,
                    properties: {
                        noteIndex: that.bibFormats.length
                    }
                })
            }
        })

        if (this.listedWorksCounter === 0) {
            return ''
        }
    }

    renderCitations() {
        for (let j = 0; j < this.citationTexts.length; j++) {
            let citationText = this.citationTexts[j][0][1]
            if ('note' == this.citationType) {
                citationText = '<span class="pagination-footnote"><span><span>' + citationText + '</span></span></span>'
            }
            this.allCitations[j].innerHTML = citationText
        }
    }

    renderBibliography() {

        this.bibliographyHTML += '<h1 id="bibliography-header"></h1>'
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

        let citeprocInstance = new CSL.Engine(new citeprocSys(this.cslDB), this.citationStyle.definition)

        let inText = citeprocInstance.cslXml.className === 'in-text'

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

        this.citationType = citeprocInstance.cslXml.className
        this.bibliography = citeprocInstance.makeBibliography()
    }
/*
    stripValues(bibValue) {
        return bibValue.replace(/[\{\}]/g, '')
    }

    getAuthor(bibData) {
        let author = bibData.author,
            returnObject = {}
        if ('' == author || 'undefined' == typeof(author)) {
            author = bibData.editor
        }
        let splitAuthor = author.split("{")
        if (splitAuthor.length > 2) {
            returnObject.firstName = author.split("{")[1].replace(/[\{\}]/g, '').replace(/^\s\s*REMOVE/, '').replace(/\s\s*$/, '')
            returnObject.lastName = author.split("{")[2].replace(/[\{\}]/g, '').replace(/^\s\s*REMOVE/, '').replace(/\s\s*$/, '')
        } else {
            returnObject.firstName = ''
            returnObject.lastName = author.split("{")[1].replace(/[\{\}]/g, '').replace(/^\s\s*REMOVE/, '').replace(/\s\s*$/, '')
        } // Remove strings "REMOVE" when reenabling this section
        return returnObject
    }*/

    /*yearFromDateString(dateString) {
        // This mirrors the formatting of the date as returned by Python in bibliography/models.py
        let dates = dateString.split('/')
        let newValue = []
        for (let x = 0; x < dates.length; x++) {
            let dateParts = dates[x].split('-')
                // Only make use of the first value (to/from years), discarding month and day values
            if (isNaN(dateParts[0])) {
                break
            }
            newValue.push(dateParts[0])
        }
        if (newValue.length === 0) {
            return 'Unpublished'
        } else if (newValue.length === 1) {
            return newValue[0]
        } else {
            return newValue[0] + '-' + newValue[1]
        }
    }*/

}
