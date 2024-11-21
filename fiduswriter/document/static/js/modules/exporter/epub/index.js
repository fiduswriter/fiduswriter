import download from "downloadjs"
import pretty from "pretty"

import {addAlert, shortFileTitle} from "../../common"
import {HTMLExporter} from "../html"
import {HTMLExporterCitations} from "../html/citations"
import {removeHidden} from "../tools/doc_content"
import {createSlug} from "../tools/file"
import {ZipFileCreator} from "../tools/zip"

import {EPUBExporterConvert} from "./convert"
import {
    containerTemplate,
    navTemplate,
    ncxTemplate,
    opfTemplate,
    xhtmlTemplate
} from "./templates"
import {
    buildHierarchy,
    getFontMimeType,
    getImageMimeType,
    getTimestamp
} from "./tools"

export class EpubExporter extends HTMLExporter {
    constructor(doc, bibDB, imageDB, csl, updated, documentStyles) {
        super(doc, bibDB, imageDB, csl, updated, documentStyles)

        // EPUB-specific properties
        this.shortLang = this.doc.settings.language.split("-")[0]
        this.lang = this.doc.settings.language
    }

    init() {
        addAlert(
            "info",
            `${this.docTitle}: ${gettext("Epub export has been initiated.")}`
        )

        this.docContent = removeHidden(this.doc.content)
        this.addDocStyle(this.doc) // Now inherited from HTMLExporter
        // Override converter class
        this.converter = new EPUBExporterConvert(
            this,
            this.imageDB,
            this.bibDB,
            this.doc.settings
        )
        this.citations = new HTMLExporterCitations(this, this.bibDB, this.csl)

        return this.loadStyles()
            .then(() => this.converter.init(this.docContent))
            .then(({html, imageIds}) => {
                const contentBody = html.split("<body")[1].split("</body>")[0]
                const bodyContent = contentBody.substring(
                    contentBody.indexOf(">") + 1
                )

                return this.createEPUBFiles(bodyContent, imageIds)
            })
            .then(() => this.save())
    }

    createEPUBFiles(bodyContent, imageIds) {
        // Generate the required EPUB files using the converted content
        const containerCode = containerTemplate()
        const timestamp = getTimestamp(this.updated)

        // Add content files
        this.textFiles.push(
            {
                filename: "META-INF/container.xml",
                contents: pretty(containerCode, {ocd: true})
            },
            {
                filename: "EPUB/document.opf",
                contents: pretty(this.createOPF(timestamp, imageIds), {
                    ocd: true
                })
            },
            {
                filename: "EPUB/document.ncx",
                contents: pretty(this.createNCX(), {ocd: true})
            },
            {
                filename: "EPUB/document-nav.xhtml",
                contents: pretty(this.createNav(), {ocd: true})
            },
            {
                filename: "EPUB/document.xhtml",
                contents: pretty(this.createXHTML(bodyContent), {ocd: true})
            }
        )

        // Add styles
        this.styleSheets.forEach(sheet => {
            this.textFiles.push({
                filename: "EPUB/" + sheet.filename,
                contents: sheet.contents
            })
        })

        // Add images
        imageIds.forEach(id => {
            const imageEntry = this.imageDB.db[id]
            this.httpFiles.push({
                filename: `EPUB/images/${imageEntry.image.split("/").pop()}`,
                url: imageEntry.image
            })
        })
    }

    createOPF(timestamp, imageIds) {
        const images = imageIds
            .map(id => {
                const imageEntry = this.imageDB.db[id]
                const filename = imageEntry.image.split("/").pop()
                return {
                    filename: `images/${filename}`,
                    url: imageEntry.image,
                    mimeType: getImageMimeType(filename)
                }
            })
            .filter(image => image.mimeType)

        const fontFiles = this.httpFiles
            .map(file =>
                Object.assign({mimeType: getFontMimeType(file.filename)}, file)
            )
            .filter(file => file.mimeType)

        // Extract authors and keywords from metaData
        const authors = this.converter.metaData.authors.map(
            ({attrs: author}) => {
                if (author.firstname || author.lastname) {
                    const nameParts = []
                    if (author.firstname) {
                        nameParts.push(author.firstname)
                    }
                    if (author.lastname) {
                        nameParts.push(author.lastname)
                    }
                    return nameParts.join(" ")
                } else if (author.institution) {
                    return author.institution
                }
            }
        )
        return opfTemplate({
            language: this.lang,
            title: this.docTitle,
            authors,
            keywords: this.converter.metaData.keywords,
            idType: "fidus",
            id: this.doc.id,
            date: timestamp.slice(0, 10),
            modified: timestamp,
            styleSheets: this.styleSheets,
            math: this.converter.features.math,
            images,
            fontFiles,
            copyright: this.doc.settings.copyright
        })
    }

    createNCX() {
        return ncxTemplate({
            shortLang: this.shortLang,
            title: this.docTitle,
            idType: "fidus",
            id: this.doc.id,
            toc: buildHierarchy(this.converter.metaData.toc)
        })
    }

    createNav() {
        return navTemplate({
            shortLang: this.shortLang,
            toc: buildHierarchy(this.converter.metaData.toc),
            styleSheets: this.styleSheets
        })
    }

    createXHTML(bodyContent) {
        return xhtmlTemplate({
            shortLang: this.shortLang,
            title: this.docTitle,
            math: this.converter.features.math,
            styleSheets: this.styleSheets,
            part: false,
            currentPart: false,
            body: bodyContent,
            copyright: this.doc.settings.copyright
        })
    }

    save() {
        if (this.converter.features.math) {
            this.includeZips.push({
                directory: "EPUB/css",
                url: staticUrl("zip/mathlive_style.zip")
            })
        }

        const zipper = new ZipFileCreator(
            this.textFiles,
            this.httpFiles,
            this.includeZips,
            "application/epub+zip",
            this.updated
        )

        return zipper.init().then(blob => this.download(blob))
    }

    download(blob) {
        return download(
            blob,
            createSlug(this.docTitle) + ".epub",
            "application/epub+zip"
        )
    }
}
