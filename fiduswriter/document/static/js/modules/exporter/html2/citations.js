import {FormatCitations} from "../../citations/format"
import {escapeText} from "../../common"
import {BIBLIOGRAPHY_HEADERS} from "../../schema/i18n"

export class HTMLExporterCitations {
    constructor(exporter, bibDB, csl) {
        this.exporter = exporter
        this.bibDB = bibDB
        this.csl = csl

        this.citationTexts = []
        this.citFm = false
        this.bibHTML = ""
        this.bibCSS = ""
        this.htmlIdConvert = {}
    }

    init(citInfos) {
        this.citInfos = citInfos
        if (!citInfos.length) {
            return Promise.resolve()
        }
        return this.formatCitations()
    }

    // Citations are highly interdependent -- so we need to format them all
    // together before laying out the document.
    formatCitations() {
        return this.csl.getStyle(this.exporter.doc.settings.citationstyle).then(
            citationstyle => {
                const modStyle = JSON.parse(JSON.stringify(citationstyle))
                const citationLayout = modStyle.children.find(section => section.name === "citation").children.find(section => section.name === "layout").attrs
                const origCitationLayout = JSON.parse(JSON.stringify(citationLayout))
                citationLayout.prefix = "{{prefix}}"
                citationLayout.suffix = "{{suffix}}"
                citationLayout.delimiter = "{{delimiter}}"
                this.citFm = new FormatCitations(
                    this.csl,
                    this.citInfos,
                    modStyle,
                    "",
                    this.bibDB,
                    false,
                    this.exporter.doc.settings.language
                )
                return Promise.all([
                    Promise.resolve(origCitationLayout),
                    this.citFm.init()
                ])
            }
        ).then(
            ([origCitationLayout]) => {
                // We need to add links to the bibliography items. And there may be more than one work cited
                // so we need to first split, then add the links and eventually put the citation back together
                // again.
                // The IDs used in the html bibliography are 1 and up in this order
                this.citFm.bibliography[0].entry_ids.forEach((id, index) => this.htmlIdConvert[id] = index + 1)
                this.citationTexts = this.citFm.citationTexts.map(
                    (ref, index) => {
                        const content = ref.split("{{delimiter}}").map((citationText, conIndex) => {
                            const prefixSplit = citationText.split("{{prefix}}")
                            const prefix = prefixSplit.length > 1 ? prefixSplit.shift() + (origCitationLayout.prefix || "") : ""
                            citationText = prefixSplit[0]
                            const suffixSplit = citationText.split("{{suffix}}")
                            const suffix = suffixSplit.length > 1 ? (origCitationLayout.suffix || "") + suffixSplit.pop() : ""
                            citationText = suffixSplit[0]
                            const citId = this.citFm.citations[index].sortedItems[conIndex][1].id
                            const htmlId = this.htmlIdConvert[citId]
                            return `${prefix}<a href="#ref-${htmlId}">${citationText}</a>${suffix}`
                        }).join((origCitationLayout.delimiter || ""))
                        return content
                    }
                )

                if (this.citFm.bibliography && this.citFm.bibliography[0].entry_ids.length) {
                    this.assembleBib()
                }

                return Promise.resolve()
            }
        )

    }

    assembleBib() {
        const settings = this.exporter.doc.settings
        const bibliographyHeader = settings.bibliography_header[settings.language] || BIBLIOGRAPHY_HEADERS[settings.language]
        let bibHTML = `<h1 class="article-bibliography-header">${escapeText(bibliographyHeader)}</h1>`
        bibHTML += this.citFm.bibliography[0].bibstart
        bibHTML += this.citFm.bibliography[1].map((reference, index) => `<div id="ref-${index + 1}">${reference}</div>`).join("")
        bibHTML += this.citFm.bibliography[0].bibend
        this.bibHTML = bibHTML
        this.bibCSS = this.citFm.bibCSS
    }
}
