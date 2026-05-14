// Mock for ../citations/format
export class FormatCitations {
    constructor(csl, citInfos, style, _format, bibDB, _doc, lang) {
        this.csl = csl
        this.citInfos = citInfos
        this.style = style
        this.bibDB = bibDB
        this.lang = lang
        this.citationTexts = []
        this.bibliography = null
    }

    init() {
        this.citationTexts = this.citInfos.map(
            ci => `<span>(${ci.references?.[0]?.id || "Unknown"})</span>`
        )
        return Promise.resolve()
    }
}
