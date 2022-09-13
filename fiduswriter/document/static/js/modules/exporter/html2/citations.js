import {FormatCitations} from "../../citations/format"

export class HTMLExporterCitations {
    constructor(exporter, bibDB, csl) {
        this.exporter = exporter
        this.bibDB = bibDB
        this.csl = csl

        this.citationTexts = []
        this.citFm = false
        this.citHTMLFm = false
        this.htmlBib = ""
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
    // We need to run this twice - once using the current document style for
    // citations and once for the HTML bibliography.
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
                    this.bibDB
                )
                this.citHTMLFm = new FormatCitations(
                    this.csl,
                    this.citInfos,
                    "html",
                    "",
                    this.bibDB
                )
                return Promise.all([
                    Promise.resolve(origCitationLayout),
                    this.citFm.init(),
                    this.citHTMLFm.init()
                ])
            }
        ).then(
            ([origCitationLayout]) => {
                // We need to add links to the bibliography items. And there may be more than one work cited
                // so we need to first split, then add the links and eventually put the citation back together
                // again.
                // The IDs used in the html bibliography are 1 and up in this order
                this.citHTMLFm.bibliography[0].entry_ids.forEach((id, index) => this.htmlIdConvert[id] = index + 1)
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
                this.htmlBib = this.citHTMLFm.bibliography[1].map(entry =>
                    entry.substring(
                        entry.indexOf("{{html}}"),
                        entry.lastIndexOf("{{/html}}")
                    ).split("{{html}}").map(
                        part => {
                            const parts = part.split("{{/html}}")
                            return parts[0].replace(/&#60;/g, "<").replace(/&#62;/g, ">") + (
                                parts[1] || ""
                            )
                        }
                    ).join("")
                ).join("")
                return Promise.resolve()
            }
        )

    }
}
