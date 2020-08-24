import download from "downloadjs"

import {createSlug} from "../tools/file"
import {removeHidden} from "../tools/doc_content"
import {JATSExporterConvert} from "./convert"
import {JATSExporterCitations} from "./citations"
import {ZipFileCreator} from "../tools/zip"
import {darManifest} from "./templates"
/*
 Exporter to JATS
*/

export class JATSExporter {
    constructor(doc, bibDB, imageDB, csl, updated) {
        this.doc = doc
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.csl = csl
        this.updated = updated

        this.docContent = false
        this.zipFileName = false
        this.textFiles = []
        this.httpFiles = []
    }

    init() {
        this.zipFileName = `${createSlug(this.doc.title)}.jats.zip`
        this.docContent = removeHidden(this.doc.content)
        this.converter = new JATSExporterConvert(this, this.imageDB, this.bibDB, this.doc.settings)
        this.citations = new JATSExporterCitations(this, this.bibDB, this.csl)
        return this.converter.init(this.docContent).then(({jats, imageIds}) => {
            this.textFiles.push({filename: 'manuscript.xml', contents: jats})
            const images = imageIds.map(
                id => {
                    const imageEntry = this.imageDB.db[id]
                    return {
                        title: imageEntry.title,
                        filename: imageEntry.image.split('/').pop(),
                        url: imageEntry.image
                    }
                }
            )
            this.textFiles.push({
                filename: 'manifest.xml',
                contents: darManifest({title: this.doc.title, images})
            })
            images.forEach(image => {
                this.httpFiles.push({filename: image.filename, url: image.url})
            })

            return this.createZip()
        })
    }

    createZip() {
        const zipper = new ZipFileCreator(
            this.textFiles,
            this.httpFiles,
            undefined,
            undefined,
            this.updated
        )
        return zipper.init().then(
            blob => this.download(blob)
        )
    }

    download(blob) {
        return download(blob, this.zipFileName, 'application/zip')
    }
}
