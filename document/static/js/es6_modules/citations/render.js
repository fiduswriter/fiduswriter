import {citeprocSys} from "./citeproc-sys"
import {citationDefinitions} from "../style/citation-definitions"
import {FormatCitations} from "./format"
/**
 * Render citations into the DOM.
 */

export class RenderCitations {
    constructor(contentElement, citationStyle, bibDB, renderNoteCitations = true, callback = false) {
        this.contentElement = contentElement
        this.citationStyle = citationStyle
        this.bibDB = bibDB
        this.renderNoteCitations = renderNoteCitations
        this.allCitationNodes = []
        this.allCitationInfos = []
        this.fm = false
        this.callback = callback
    }

    init() {
        let that = this
        this.allCitationNodes = [].slice.call(jQuery(this.contentElement).find('.citation'))
        this.allCitationNodes.forEach(function(cElement){
            that.allCitationInfos.push(cElement.dataset)
        })
        this.fm = new FormatCitations(this.allCitationInfos, this.citationStyle, this.bibDB, function() {
            if (that.renderNoteCitations || 'note' !== that.fm.citationType) {
                that.renderCitations()
            } else if (that.callback) {
                that.callback()
            }
        })
        this.fm.init()
    }



    renderCitations() {
        for (let j = 0; j < this.fm.citationTexts.length; j++) {
            let citationText = this.fm.citationTexts[j][0][1]
            if ('note' === this.fm.citationType) {
                citationText = '<span class="pagination-footnote"><span><span>' + citationText + '</span></span></span>'
            }
            this.allCitationNodes[j].innerHTML = citationText
        }
        if (this.callback) {
            this.callback()
        }
    }

}
