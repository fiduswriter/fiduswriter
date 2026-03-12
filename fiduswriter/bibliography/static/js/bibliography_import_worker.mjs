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
    RISParser
} from "biblatex-csl-converter"

addEventListener("message", message => {
    const {fileContents, format} = message.data
    let parser
    let parseResult

    try {
        // Select the appropriate parser based on the detected format
        switch (format) {
            case "biblatex":
                parser = new BibLatexParser(fileContents)
                parseResult = parser.parse()
                break
            case "csl_json":
                parser = new CSLParser(fileContents)
                parseResult = parser.parse()
                break
            case "ris":
                parser = new RISParser(fileContents)
                parseResult = parser.parse()
                break
            case "enw":
                parser = new ENWParser(fileContents)
                parseResult = parser.parse()
                break
            case "nbib":
                parser = new NBIBParser(fileContents)
                parseResult = parser.parse()
                break
            case "endnote_xml":
                parser = new EndNoteParser(fileContents)
                parseResult = parser.parse()
                break
            case "citavi_xml":
                parser = new CitaviXmlParser(fileContents)
                parseResult = parser.parse()
                break
            case "citavi_json":
                parser = new CitaviParser(fileContents)
                parseResult = parser.parse()
                break
            case "odt_citations":
                parser = new OdtCitationsParser(fileContents)
                parseResult = parser.parse()
                break
            case "docx_citations":
                parser = new DocxCitationsParser(fileContents)
                parseResult = parser.parse()
                break
            default:
                postMessage({
                    type: "error",
                    errorCode: "unsupported_format",
                    done: true
                })
                return
        }

        // Extract entries from parse result
        const entries = parseResult.entries || {}
        const bibKeys = Object.keys(entries)

        if (!bibKeys.length) {
            postMessage({
                type: "error",
                errorCode: "no_entries",
                done: true
            })
            return
        }

        // Process entries - add default values for required fields
        bibKeys.forEach(bibKey => {
            const bibEntry = entries[bibKey]
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
                postMessage({
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
                postMessage({
                    type: "warning",
                    errorCode: warning.type || "unknown",
                    ...warning
                })
            })
        }

        // Send entries in chunks of 50
        const totalChunks = Math.ceil(bibKeys.length / 50)
        let currentChunkNumber = 0

        function processChunk() {
            if (currentChunkNumber < totalChunks) {
                const fromNumber = currentChunkNumber * 50
                const toNumber = fromNumber + 50
                const currentChunk = {}
                bibKeys.slice(fromNumber, toNumber).forEach(bibKey => {
                    currentChunk[bibKey] = entries[bibKey]
                })
                postMessage({type: "data", data: currentChunk})
                currentChunkNumber++
                processChunk()
            } else {
                postMessage({type: "ok", done: true})
            }
        }

        processChunk()
    } catch (error) {
        postMessage({
            type: "error",
            errorCode: "parse_error",
            errorType: error.message || "unknown",
            done: true
        })
    }
})
