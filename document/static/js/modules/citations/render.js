import {FormatCitations} from "./format"
/**
 * Render citations into the DOM.
 */

export class RenderCitations {
    constructor(contentElement, citationStyle, bibliographyHeader, bibDB, citationStyles, citationLocales) {
        this.contentElement = contentElement
        this.citationStyle = citationStyle
        this.bibliographyHeader = bibliographyHeader
        this.bibDB = bibDB
        this.citationStyles = citationStyles
        this.citationLocales = citationLocales
        this.allCitationNodes = []
        this.allCitationInfos = []
        this.fm = false
    }

    init() {
        this.allCitationNodes = this.contentElement.querySelectorAll('span.citation')
        this.allCitationNodes.forEach((cElement) => {
            const citeInfo = Object.assign({}, cElement.dataset)
            citeInfo.references = JSON.parse(citeInfo.references)
            this.allCitationInfos.push(citeInfo)
        })
        this.fm = new FormatCitations(
            this.allCitationInfos,
            this.citationStyle,
            this.bibliographyHeader,
            this.bibDB,
            this.citationStyles,
            this.citationLocales
        )
        return this.fm.init().then(
            () => this.renderCitations()
        )
    }

    renderCitations() {
        if ('note' !== this.fm.citationType) {
            this.fm.citationTexts.forEach((citationText, index) => this.allCitationNodes[index].innerHTML = citationText)
        }
        return Promise.resolve()
    }

}
