import {citeprocSys} from "./citeproc-sys"

/**
 * Functions to display citations and the bibliography.
 */

export let formatCitations = function(contentElement, citationstyle, aBibDB) {
     let bibliographyHTML = '',
         allCitations = jQuery(contentElement).find('.citation'),
         listedWorksCounter = 0,
         citeprocParams = [],
         bibFormats = [],
         citationsIds = []

     allCitations.each(function(i) {
         var entries = this.dataset.bibEntry ? this.dataset.bibEntry.split(',') : []
         let allCitationsListed = true

         let len = entries.length
         for (let j = 0; j < len; j++) {
             if (aBibDB.hasOwnProperty(entries[j])) {
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

             listedWorksCounter += entries.length

             for (let j = 0; j < len; j++) {
                 citationItem = {
                     id: entries[j]
                 }
                 if ('' != pages[j]) {
                     citationItem.locator = pages[j]
                 }
                 if ('' != prefixes[j]) {
                     citationItem.prefix = prefixes[j]
                 }
                 //if('' != suffixes[j]) { citationItem.suffix = pages[j] }
                 citationItems.push(citationItem)
             }

 //            bibFormats.push(i)
             bibFormats.push(this.dataset.bibFormat)
             citeprocParams.push({
                 citationItems: citationItems,
                 properties: {
                     noteIndex: bibFormats.length
                 }
             })
         }
     })

     if (listedWorksCounter == 0) {
         return ''
     }

     let citeprocObj = getFormattedCitations(citeprocParams, citationstyle, bibFormats, aBibDB)

     for (let j = 0; j < citeprocObj.citations.length; j++) {
         var citationText = citeprocObj.citations[j][0][1]
         if ('note' == citeprocObj.citationtype) {
             citationText = '<span class="pagination-footnote"><span><span>' + citationText + '</span></span></span>'
         }
         allCitations[j].innerHTML = citationText
     }


     bibliographyHTML += '<h1>' + gettext('Bibliography') + '</h1>'
         // Add entry to bibliography

     for (let j = 0; j < citeprocObj.bibliography[1].length; j++) {
         bibliographyHTML += citeprocObj.bibliography[1][j]
     }

     return bibliographyHTML
         // Delete entries that are exactly the same
         //bibliographyHTML = _.unique(bibliographyHTML.split('<p>')).join('<p>')
         //bibliographyHTML = bibliographyHTML.replace(/<div class="csl-entry">/g, '<p>')
         //return bibliographyHTML.replace(/<\/div>/g, '</p>')
 }




let getFormattedCitations = function (citations, citationStyle, citationFormats, aBibDB) {
    bibliographyHelpers.setCSLDB(aBibDB)

    if (citeproc.styles.hasOwnProperty(citationStyle)) {
        citationStyle = citeproc.styles[citationStyle]
    } else {
        for (styleName in citeproc.styles) {
            citationStyle = citeproc.styles[styleName]
            break
        }
    }

    let citeprocInstance = new CSL.Engine(new citeprocSys(), citationStyle.definition)

    let inText = citeprocInstance.cslXml.className === 'in-text'

    let len = citations.length

    let citationTexts = []

    for (let i = 0; i < len; i++) {
        let citation = citations[i],
            citationText = citeprocInstance.appendCitationCluster(citation)

        if (inText && 'textcite' == citationFormats[i]) {
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

        citationTexts.push(citationText)
    }

    return {
        'citations': citationTexts,
        'bibliography': citeprocInstance.makeBibliography(),
        'citationtype': citeprocInstance.cslXml.className
    }
}

let stripValues = function(bibValue) {
    return bibValue.replace(/[\{\}]/g, '')
}

let getAuthor = function(bibData) {
    let author = bibData.author,
        returnObject = {}
    if ('' == author || 'undefined' == typeof(author)) {
        author = bibData.editor
    }
    let splitAuthor = author.split("{")
    if (splitAuthor.length > 2) {
        returnObject.firstName = author.split("{")[1].replace(/[\{\}]/g, '').replace(/^\s\s*/, '').replace(/\s\s*$/, '')
        returnObject.lastName = author.split("{")[2].replace(/[\{\}]/g, '').replace(/^\s\s*/, '').replace(/\s\s*$/, '')
    } else {
        returnObject.firstName = ''
        returnObject.lastName = author.split("{")[1].replace(/[\{\}]/g, '').replace(/^\s\s*/, '').replace(/\s\s*$/, '')
    }
    return returnObject
}

let yearFromDateString = function(dateString) {
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
}
