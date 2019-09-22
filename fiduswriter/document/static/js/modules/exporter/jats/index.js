import download from "downloadjs"

import {createSlug} from "../tools/file"
import {removeHidden} from "../tools/doc_contents"
import {JATSExporterConvert} from "./convert"
import {JATSExporterCitations} from "./citations"
import {ZipFileCreator} from "../tools/zip"
import {darManifest, readMe} from "./templates"
/*
 Exporter to JATS
*/

export class JATSExporter {
    constructor(staticUrl, doc, bibDB, imageDB, csl) {
        this.staticUrl = staticUrl
        this.doc = doc
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.csl = csl

        this.docContents = false
        this.zipFileName = false
        this.textFiles = []
        this.httpFiles = []
    }

    init() {
        this.zipFileName = `${createSlug(this.doc.title)}.jats.zip`
        this.docContents = removeHidden(this.doc.contents)
        this.converter = new JATSExporterConvert(this, this.imageDB, this.bibDB, this.doc.settings)
        this.citations = new JATSExporterCitations(this, this.bibDB, this.csl)
        this.conversion = this.converter.init(this.docContents).then(({jats, imageIds}) => {
            this.textFiles.push({filename: 'manuscript.xml', contents: jats})
            this.textFiles.push({filename: 'README.txt', contents: readMe})
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

            const zipper = new ZipFileCreator(
                this.textFiles,
                this.httpFiles
            )
            return zipper.init()
        }).then(
            blob => download(blob, this.zipFileName, 'application/zip')
        )
    }
}
