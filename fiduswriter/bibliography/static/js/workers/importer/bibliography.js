import {
    BibLatexParser,
    CSLParser,
    CitaviParser,
    CitaviXmlParser,
    DocxCitationsParser,
    ENWParser,
    EndNoteParser,
    NBIBParser,
    OdtCitationsParser,
    RISParser,
    sniffFormat
} from "biblatex-csl-converter"

export class BibliographyImportWorker {
    constructor(fileContents, sendMessage, csrfToken, domain, format = null) {
        this.fileContents = fileContents
        this.sendMessage = sendMessage
        this.csrfToken = csrfToken
        this.domain = domain
        this.format = format
    }

    /** Second step of the bibliography file import. Takes a file object,
     * processes client side and cuts into chunks to be uploaded to the server.
     */
    init() {
        // Detect format if not provided
        const detectedFormat = this.format || sniffFormat(this.fileContents)

        if (!detectedFormat) {
            this.sendMessage({
                type: "error",
                errorCode: "unsupported_format",
                done: true
            })
            return
        }

        let parser
        let parseResult

        try {
            // Select the appropriate parser based on the detected format
            switch (detectedFormat) {
                case "biblatex":
                    parser = new BibLatexParser(this.fileContents)
                    parseResult = parser.parse()
                    break
                case "csl_json":
                    parser = new CSLParser(this.fileContents)
                    parseResult = parser.parse()
                    break
                case "ris":
                    parser = new RISParser(this.fileContents)
                    parseResult = parser.parse()
                    break
                case "enw":
                    parser = new ENWParser(this.fileContents)
                    parseResult = parser.parse()
                    break
                case "nbib":
                    parser = new NBIBParser(this.fileContents)
                    parseResult = parser.parse()
                    break
                case "endnote_xml":
                    parser = new EndNoteParser(this.fileContents)
                    parseResult = parser.parse()
                    break
                case "citavi_xml":
                    parser = new CitaviXmlParser(this.fileContents)
                    parseResult = parser.parse()
                    break
                case "citavi_json":
                    parser = new CitaviParser(this.fileContents)
                    parseResult = parser.parse()
                    break
                case "odt_citations":
                    parser = new OdtCitationsParser(this.fileContents)
                    parseResult = parser.parse()
                    break
                case "docx_citations":
                    parser = new DocxCitationsParser(this.fileContents)
                    parseResult = parser.parse()
                    break
                default:
                    this.sendMessage({
                        type: "error",
                        errorCode: "unsupported_format",
                        done: true
                    })
                    return
            }

            // Extract entries from parse result
            this.tmpDB = parseResult.entries || {}
            this.bibKeys = Object.keys(this.tmpDB)

            if (!this.bibKeys.length) {
                this.sendMessage({
                    type: "error",
                    errorCode: "no_entries",
                    done: true
                })
                return
            }

            // Process entries - add default values for required fields
            this.bibKeys.forEach(bibKey => {
                const bibEntry = this.tmpDB[bibKey]
                // Add an empty category list for all newly imported entries
                bibEntry.cats = []
                // If the entry has no title, add an empty title
                if (!bibEntry.fields.title) {
                    bibEntry.fields.title = []
                }
                // If the entry has no date, add an uncertain date
                if (!bibEntry.fields.date) {
                    bibEntry.fields.date = "uuuu"
                }
                // If the entry has no editor or author, add empty author
                if (!bibEntry.fields.author && !bibEntry.fields.editor) {
                    bibEntry.fields.author = [{literal: []}]
                }
            })

            // Send errors and warnings
            if (parser.errors) {
                parser.errors.forEach(error => {
                    this.sendMessage({
                        type: "error",
                        errorCode: "entry_error",
                        errorType: error.type || "unknown",
                        key: error.key,
                        entry: error.entry,
                        ...error
                    })
                })
            }

            if (parser.warnings) {
                parser.warnings.forEach(warning => {
                    this.sendMessage({
                        type: "warning",
                        errorCode: warning.type || "unknown",
                        ...warning
                    })
                })
            }

            // Send entries in chunks
            this.totalChunks = Math.ceil(this.bibKeys.length / 50)
            this.currentChunkNumber = 0
            this.processChunk()
        } catch (error) {
            this.sendMessage({
                type: "error",
                errorCode: "parse_error",
                errorType: error.message || "unknown",
                done: true
            })
        }
    }

    processChunk() {
        if (this.currentChunkNumber < this.totalChunks) {
            const fromNumber = this.currentChunkNumber * 50
            const toNumber = fromNumber + 50
            const currentChunk = {}
            this.bibKeys.slice(fromNumber, toNumber).forEach(bibKey => {
                currentChunk[bibKey] = this.tmpDB[bibKey]
            })
            this.sendMessage({type: "data", data: currentChunk})
            this.currentChunkNumber++
            this.processChunk()
        } else {
            this.sendMessage({type: "ok", done: true})
        }
    }
}
