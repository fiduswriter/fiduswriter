import {FormatCitations} from "./format"
/**
 * Render citations into the DOM.
 */

export class RenderCitations {
    constructor(contentElement, citationStyle, bibDB, citationStyles, citationLocales, renderNoteCitations = true) {
        this.contentElement = contentElement
        this.citationStyle = citationStyle
        this.bibDB = bibDB
        this.citationStyles = citationStyles
        this.citationLocales = citationLocales
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
            this.bibDB,
            this.citationStyles,
            this.citationLocales
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
        this.fm.citationTexts.forEach(citText => {
            citText.forEach(entry => {
                let index = entry[0],
                    citationText = entry[1]
                if ('note' === this.fm.citationType) {
                    citationText =
                        `<span class="pagination-footnote"><span><span>
                            ${citationText}
                        </span></span></span>`
                }
                this.allCitationNodes[index].innerHTML = citationText
            })
        })
    }

}
