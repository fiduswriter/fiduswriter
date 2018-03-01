import {BibLatexParser} from "biblatex-csl-converter"
import {BibliographyDBServerConnector} from "../bibliography/database/server_connector"

export class BibLatexFileImporter {
    constructor(fileContents, sendMessage) {
        this.fileContents = fileContents
        this.sendMessage = sendMessage
        this.sc = new BibliographyDBServerConnector()
    }

    /** Second step of the BibTeX file import. Takes a BibTeX file object,
     * processes client side and cuts into chunks to be uploaded to the server.
     */
    init() {
        let bibData = new BibLatexParser(this.fileContents)
        this.tmpDB = bibData.output
        this.bibKeys = Object.keys(this.tmpDB)
        if (!this.bibKeys.length) {
            this.sendMessage({type: 'error', errorMsg: gettext('No bibliography entries could be found in import file.'), done: true})
            return
        } else {
            this.bibKeys.forEach((bibKey) => {
                let bibEntry = this.tmpDB[bibKey]
                // We add an empty category list for all newly imported bib entries.
                bibEntry.entry_cat = []
                // If the entry has no title, add an empty title
                if (!bibEntry.fields.title) {
                    bibEntry.fields.title = []
                }
                // If the entry has no date, add an uncertain date
                if (!bibEntry.fields.date) {
                    bibEntry.fields.date = 'uuuu'
                }
                // If the entry has no editor or author, add empty author
                if (!bibEntry.fields.author && !bibEntry.fields.editor) {
                    bibEntry.fields.author = [{'literal': []}]
                }
            })
            bibData.errors.forEach(error => {
                let errorMsg = gettext('An error occured while reading the bibtex file')
                errorMsg += `, error_code: ${error.type}`
                if (error.key) {
                    errorMsg += `, key: ${error.key}`
                }
                this.sendMessage({type: 'error', errorMsg})
            })
            bibData.warnings.forEach(warning => {
                let warningMsg
                switch (warning.type) {
                    case 'unknown_field':
                        warningMsg = warning.field_name + gettext(' of ') +
                            warning.entry +
                            gettext(' cannot not be saved. Fidus Writer does not support the field.')
                        break
                    case 'unknown_type':
                        warningMsg = warning.type_name + gettext(' of ') +
                            warning.entry +
                            gettext(' is saved as "misc". Fidus Writer does not support the entry type.')
                        break
                    case 'unknown_date':
                        warningMsg = warning.field_name + gettext(' of ') +
                            warning.entry +
                            gettext(' not a valid EDTF string.')
                        break
                    default:
                        warningMsg = gettext('An warning occured while reading the bibtex file')
                        warningMsg += `, warning_code: ${warning.type}`
                        if (warning.key) {
                            warningMsg += `, key: ${warning.key}`
                        }
                }
                this.sendMessage({type: 'warning', warningMsg})
            })
            this.totalChunks = Math.ceil(this.bibKeys.length / 50)
            this.currentChunkNumber = 0
            this.processChunk()
        }

    }

    processChunk() {
        if (this.currentChunkNumber < this.totalChunks) {
            let fromNumber = this.currentChunkNumber * 50
            let toNumber = fromNumber + 50
            let currentChunk = {}
            this.bibKeys.slice(fromNumber, toNumber).forEach((bibKey)=>{
                currentChunk[bibKey] = this.tmpDB[bibKey]
            })
            this.sc.saveBibEntries(currentChunk, true).then(
                idTranslations => {
                    this.sendMessage({
                        type: 'savedBibEntries',
                        tmpDB: currentChunk,
                        idTranslations
                    })
                    this.currentChunkNumber++
                    this.processChunk()
                }
            ).catch(
                error => {
                    this.sendMessage({type: 'error', errorMsg: gettext('The bibliography could not be updated'), done: true})
                    throw(error)
                }
            )
        } else {
            this.sendMessage({type: 'ok', done: true})
        }
    }
}
