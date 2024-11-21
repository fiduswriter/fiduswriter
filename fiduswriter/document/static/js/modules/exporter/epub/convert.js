import {HTMLExporterConvert} from "../html/convert"

export class EPUBExporterConvert extends HTMLExporterConvert {
    constructor(exporter, imageDB, bibDB, settings) {
        super(exporter, imageDB, bibDB, settings, true, true) // xhtml=true, epub=true
    }

    addFootnotes() {
        // Use epub-type instead of role for footnotes
        this.footnotes = this.footnotes.map(fn =>
            fn.replace(/role="doc-footnote"/g, 'epub:type="footnote"')
        )
    }

    assembleBody(docContent) {
        return `<div class="content">${this.walkJson(docContent)}</div>`
    }
}
