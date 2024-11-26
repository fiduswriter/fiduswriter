import download from "downloadjs"
import pretty from "pretty"

import {get, shortFileTitle} from "../../common"
import {removeHidden} from "../tools/doc_content"
import {createSlug} from "../tools/file"
import {ZipFileCreator} from "../tools/zip"

import {HTMLExporterConvert} from "./convert"
import {htmlExportTemplate} from "./templates"
/*
 Exporter to HTML
*/

export class HTMLExporter {
    constructor(doc, bibDB, imageDB, csl, updated, documentStyles) {
        this.doc = doc
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.csl = csl
        this.updated = updated
        this.documentStyles = documentStyles

        this.docTitle = shortFileTitle(this.doc.title, this.doc.path)

        this.docContent = false
        this.zipFileName = false
        this.textFiles = []
        this.httpFiles = []
        this.includeZips = []
        // Stylesheets can have:
        // a url - which means they will be fetched before they are included as a separate file
        // a filename and contents - which means they will be included as a separate file
        // only contents - which means they will be incldued inside <style></style> tags in the document header
        // only filename - which means they will be referenced as a sepaarte file. You need to add the file yourself.
        this.styleSheets = [{url: staticUrl("css/document.css")}]
        // To override in subclasses
        this.htmlExportTemplate = htmlExportTemplate
        this.fileEnding = "html.zip"
        this.mimeType = "application/zip"
        this.xhtml = false
        this.epub = false
    }

    async init() {
        this.zipFileName = `${createSlug(this.docTitle)}.${this.fileEnding}`
        this.docContent = removeHidden(this.doc.content)
        this.addDocStyle(this.doc)
        this.converter = new HTMLExporterConvert(
            this.docTitle,
            this.doc.settings,
            this.docContent,
            this.htmlExportTemplate,
            this.imageDB,
            this.bibDB,
            this.csl,
            this.styleSheets,
            this.xhtml,
            this.epub
        )

        const {html, imageIds, extraStyleSheets} = await this.converter.init()

        this.addDoc(html)
        this.addImages(imageIds)
        this.styleSheets = this.styleSheets.concat(extraStyleSheets)
        await this.loadStyles()
        await this.createZip()
    }

    addDoc(html) {
        this.textFiles.push({
            filename: this.xhtml ? "document.xhtml" : "document.html",
            contents: pretty(html, {ocd: true})
        })
    }

    addImages(imageIds) {
        imageIds.forEach(id => {
            const image = this.imageDB.db[id]
            this.httpFiles.push({
                filename: `images/${image.image.split("/").pop()}`,
                url: image.image
            })
        })
    }

    addDocStyle(doc) {
        const docStyle = this.documentStyles.find(
            docStyle => docStyle.slug === doc.settings.documentstyle
        )

        // The files will be in the base directory. The filenames of
        // DocumentStyleFiles will therefore not need to replaced with their URLs.
        if (!docStyle) {
            return
        }
        let contents = docStyle.contents
        docStyle.documentstylefile_set.forEach(
            ([_url, filename]) =>
                (contents = contents.replace(
                    new RegExp(filename, "g"),
                    `media/${filename}`
                ))
        )
        this.styleSheets.push({contents, filename: `css/${docStyle.slug}.css`})
        this.httpFiles = this.httpFiles.concat(
            docStyle.documentstylefile_set.map(([url, filename]) => ({
                filename: `css/media/${filename}`,
                url
            }))
        )
    }

    async loadStyles() {
        const p = []
        this.styleSheets.forEach(sheet => {
            if (sheet.url) {
                p.push(this.getStyleSheet(sheet))
            }
        })
        await Promise.all(p)

        this.styleSheets.forEach(styleSheet => {
            if (styleSheet.filename) {
                this.textFiles.push(styleSheet)
            }
        })

        if (this.converter.features.math) {
            this.includeZips.push({
                directory: "css",
                url: staticUrl("zip/mathlive_style.zip")
            })
        }
    }

    async getStyleSheet(sheet) {
        const response = await get(sheet.url)
        const text = await response.text()
        sheet.contents = text
        sheet.filename = `css/${sheet.url.split("/").pop().split("?")[0]}`
        delete sheet.url
    }

    async createZip() {
        const zipper = new ZipFileCreator(
            this.textFiles,
            this.httpFiles,
            this.includeZips,
            this.mimeType,
            this.updated
        )
        const blob = await zipper.init()
        return this.download(blob)
    }

    download(blob) {
        return download(blob, this.zipFileName, this.mimeType)
    }
}
