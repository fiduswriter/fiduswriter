import download from "downloadjs"
import pretty from "pretty"

import {shortFileTitle, get} from "../../common"
import {createSlug} from "../tools/file"
import {removeHidden} from "../tools/doc_content"
import {HTMLExporterConvert} from "./convert"
import {HTMLExporterCitations} from "./citations"
import {ZipFileCreator} from "../tools/zip"
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
        this.styleSheets = [
            {url: staticUrl("css/document.css")}
        ]
    }

    init() {
        this.zipFileName = `${createSlug(this.docTitle)}.html.zip`
        this.docContent = removeHidden(this.doc.content)
        this.addDocStyle(this.doc)
        this.converter = new HTMLExporterConvert(this, this.imageDB, this.bibDB, this.doc.settings)
        this.citations = new HTMLExporterCitations(this, this.bibDB, this.csl)
        return this.loadStyles().then(
            () => this.converter.init(this.docContent)
        ).then(
            ({html, imageIds}) => {
                this.textFiles.push({filename: "document.html", contents: pretty(html, {ocd: true})})
                const images = imageIds.map(
                    id => {
                        const imageEntry = this.imageDB.db[id]
                        return {
                            title: imageEntry.title,
                            filename: `images/${imageEntry.image.split("/").pop()}`,
                            url: imageEntry.image
                        }
                    }
                )
                images.forEach(image => {
                    this.httpFiles.push({filename: image.filename, url: image.url})
                })
            }
        ).then(
            () => {
                this.styleSheets.forEach(styleSheet => {
                    if (styleSheet.filename) {
                        this.textFiles.push(styleSheet)
                    }
                })

                if (this.converter.features.math) {
                    this.styleSheets.push({filename: "css/mathlive.css"})
                    this.includeZips.push({
                        "directory": "css",
                        "url": staticUrl("zip/mathlive_style.zip"),
                    })
                }

                return this.createZip()
            }
        )
    }

    addDocStyle(doc) {
        const docStyle = this.documentStyles.find(docStyle => docStyle.slug === doc.settings.documentstyle)

        // The files will be in the base directory. The filenames of
        // DocumentStyleFiles will therefore not need to replaced with their URLs.
        if (!docStyle) {
            return
        }
        let contents = docStyle.contents
        docStyle.documentstylefile_set.forEach(
            ([_url, filename]) => contents = contents.replace(
                new RegExp(filename, "g"),
                `media/${filename}`
            )
        )
        this.styleSheets.push({contents, filename: `css/${docStyle.slug}.css`})
        this.httpFiles = this.httpFiles.concat(docStyle.documentstylefile_set.map(([url, filename]) => ({
            filename: `css/media/${filename}`,
            url
        })))
    }

    loadStyles() {
        const p = []
        this.styleSheets.forEach(sheet => {
            if (sheet.url) {
                p.push(
                    get(sheet.url).then(
                        response => response.text()
                    ).then(
                        response => {
                            sheet.contents = response
                            sheet.filename = `css/${sheet.url.split("/").pop().split("?")[0]}`
                            delete sheet.url
                        }
                    )
                )
            }
        })
        return Promise.all(p)
    }

    addMathliveStylesheet() {
        this.styleSheets.push({filename: "css/mathlive.css"})
    }

    createZip() {
        const zipper = new ZipFileCreator(
            this.textFiles,
            this.httpFiles,
            this.includeZips,
            undefined,
            this.updated
        )
        return zipper.init().then(
            blob => this.download(blob)
        )
    }

    download(blob) {
        return download(blob, this.zipFileName, "application/zip")
    }
}
