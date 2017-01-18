import {FormatCitations} from "./format"
/**
 * Render citations into the DOM.
 */

export class RenderCitations {
    constructor(contentElement, citationStyle, bibDB, renderNoteCitations = true) {
        this.contentElement = contentElement
        this.citationStyle = citationStyle
        this.bibDB = bibDB
        this.renderNoteCitations = renderNoteCitations
        this.allCitationNodes = []
        this.allCitationInfos = []
        this.fm = false
    }

    init() {
        this.allCitationNodes = [].slice.call(jQuery(this.contentElement).find('span.citation'))
        this.allCitationNodes.forEach((cElement) => {
            let citeInfo = Object.assign({},cElement.dataset)
            citeInfo.references = JSON.parse(citeInfo.references)
            this.allCitationInfos.push(citeInfo)
        })
        this.fm = new FormatCitations(
            this.allCitationInfos,
            this.citationStyle,
            this.bibDB
        )
        return this.fm.init().then(
            () => {
                if (this.renderNoteCitations || 'note' !== this.fm.citationType) {
                    this.renderCitations()
                }
                return Promise.resolve()
            }
        )
    }

    renderCitations() {
        this.fm.citationTexts.forEach((citText, index) => {
            let citationText = citText[citText.length - 1][1]
            if ('note' === this.fm.citationType) {
                citationText = `<span class="pagination-footnote"><span><span>${citationText}</span></span></span>`
            }
            this.allCitationNodes[index].innerHTML = citationText
        })
    }

}
