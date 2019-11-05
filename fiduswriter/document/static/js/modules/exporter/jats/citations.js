import {FormatCitations} from "../../citations/format"

export class JATSExporterCitations {
    constructor(exporter, bibDB, csl) {
        this.exporter = exporter
        this.bibDB = bibDB
        this.csl = csl

        this.citationTexts = []
        this.citFm = false
        this.citJATSFm = false
        this.jatsBib = ''
        this.jatsIdConvert = {}
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
    // citations and once for the JATS bibliography.
    formatCitations() {
        return this.csl.getStyle(this.exporter.doc.settings.citationstyle).then(
            citationstyle => {
                const modStyle = JSON.parse(JSON.stringify(citationstyle))
                const citationLayout = modStyle.children.find(section => section.name === 'citation').children.find(section => section.name === 'layout').attrs
                const origCitationLayout = JSON.parse(JSON.stringify(citationLayout))
                citationLayout.prefix = '{{prefix}}'
                citationLayout.suffix = '{{suffix}}'
                citationLayout.delimiter = '{{delimiter}}'
                this.citFm = new FormatCitations(
                    this.csl,
                    this.citInfos,
                    modStyle,
                    '',
                    this.bibDB
                )
                this.citJATSFm = new FormatCitations(
                    this.csl,
                    this.citInfos,
                    'jats',
                    '',
                    this.bibDB
                )
                return Promise.all([
                    Promise.resolve(origCitationLayout),
                    this.citFm.init(),
                    this.citJATSFm.init()
                ])
            }
        ).then(
            ([origCitationLayout]) => {
                // We need to add xref-links to the bibliography items. And there may be more than one work cited
                // so we need to first split, then add the links and eventually put the citation back together
                // again.
                // The IDs used in the jats bibliography are 1 and up in this order
                this.citJATSFm.bibliography[0].entry_ids.forEach((id, index) => this.jatsIdConvert[id] = index + 1)
                this.citationTexts = this.citFm.citationTexts.map(
                    (ref, index) => {
                        const content = ref.split('{{delimiter}}').map((citationText, conIndex) => {
                            const prefixSplit = citationText.split('{{prefix}}')
                            const prefix = prefixSplit.length > 1 ? prefixSplit.shift() + (origCitationLayout.prefix || '') : ''
                            citationText = prefixSplit[0]
                            const suffixSplit = citationText.split('{{suffix}}')
                            const suffix = suffixSplit.length > 1 ? (origCitationLayout.suffix || '') + suffixSplit.pop() : ''
                            citationText = suffixSplit[0]
                            const citId = this.citFm.citations[index].sortedItems[conIndex][1].id
                            const jatsId = this.jatsIdConvert[citId]
                            return `${prefix}<xref ref-type="bibr" rid="ref-${jatsId}">${citationText}</xref>${suffix}`
                        }).join((origCitationLayout.delimiter || ''))
                        return content.replace(/<b>/g, '<bold>').replace(/<\/b>/g, '</bold>')
                            .replace(/<i>/g, '<italic>').replace(/<\/i>/g, '</italic>')
                            .replace(/<span style="font-variant:small-caps;">/g, '<sc>').replace(/<\/span>/g, '</sc>')

                    }
                )
                this.jatsBib = this.citJATSFm.bibliography[1].map(entry =>
                    entry.substring(
                        entry.indexOf('{{jats}}'),
                        entry.lastIndexOf('{{/jats}}')
                    ).split('{{jats}}').map(
                        part => {
                            const parts = part.split('{{/jats}}')
                            return parts[0].replace(/&#60;/g, '<').replace(/&#62;/g, '>') + (
                                parts[1] ?
                                    parts[1].replace(/<b>/g, '<bold>').replace(/<\/b>/g, '</bold>')
                                        .replace(/<i>/g, '<italic>').replace(/<\/i>/g, '</italic>')
                                        .replace(/<span style="font-variant:small-caps;">/g, '<sc>').replace(/<\/span>/g, '</sc>') :
                                    ''
                            )
                        }
                    ).join('')
                ).join('')
                return Promise.resolve()
            }
        )

    }
}
