import {WordExporterRels} from "./rels"

export class WordExporterFootnotes {
    constructor(exporter) {
        this.exporter = exporter
        this.footnotes = []
    }

    init() {
        this.findFootnotes()
        if (this.footnotes.length) {
            this.exporter.rels['footnotes'] = new WordExporterRels(this.exporter, 'footnotes')
            return  this.exporter.rels['footnotes'].init()
        } else {
            // No footnotes were found.
            return window.Promise.resolve()
        }
    }

    findFootnotes() {
        let that = this
        this.exporter.pmDoc.descendants(
            function(node) {
                if (node.type.name==='footnote') {
                    that.footnotes.push(node)
                }
            }
        )
    }
}
