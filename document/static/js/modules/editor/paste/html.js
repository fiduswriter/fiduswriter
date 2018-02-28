import {GeneralPasteHandler} from "./general"
import {MicrosoftWordPasteHandler} from "./microsoft_word"
import {LibreOfficeWriterPasteHandler} from "./libreoffice_writer"
import {GoogleDocsPasteHandler} from "./google_docs"

// Some pasted HTML will need slight conversions to work correctly.
// We try to sniff whether paste comes from MsWord, LibreOffice or Google Docs
// and use specialized handlers for these and a general handler everything else.

export class HTMLPaste {
    constructor(inHTML, pmType) {
        this.inHTML = inHTML
        this.pmType = pmType
    }

    getOutput() {
        this.parseHTML()
        this.selectHandler()
        this.handlerInstance = new this.handler(this.htmlDoc, this.pmType)
        this.outHTML = this.handlerInstance.getOutput()
        return this.outHTML
    }

    parseHTML() {
        let parser = new window.DOMParser()
        this.htmlDoc = parser.parseFromString(this.inHTML, "text/html").getElementsByTagName('html')[0]
    }

    // Find out what the source of the paste is and choose a corresponding
    // handler.
    selectHandler() {
        // For LibreOffice
        let head = this.htmlDoc.getElementsByTagName('head')[0]
        let generatorMetaTag = head.querySelector('meta[name=generator]')
        // For Google Docs
        let body = this.htmlDoc.getElementsByTagName('body')[0]
        let firstB = body.querySelector('b')
        if (this.htmlDoc.hasAttribute('xmlns:w') &&
            this.htmlDoc.getAttribute('xmlns:w') === "urn:schemas-microsoft-com:office:word"
        ) {
            this.handler = MicrosoftWordPasteHandler
        } else if (generatorMetaTag && generatorMetaTag.content && generatorMetaTag.content.startsWith('LibreOffice')) {
            this.handler = LibreOfficeWriterPasteHandler
        } else if (firstB && firstB.id.startsWith("docs-internal-guid")) {
            this.handler = GoogleDocsPasteHandler
        } else {
            this.handler = GeneralPasteHandler
        }
    }

}
