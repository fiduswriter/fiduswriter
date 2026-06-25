import download from "downloadjs"

import {ShrinkFidus} from "@fiduswriter/document/exporter/native/shrink"
import {createSlug} from "@fiduswriter/document/exporter/tools/file"
import {shortFileTitle} from "fwtoolkit"
import {ZipFidus} from "./zip"

export class ExportFidusFile {
    constructor(doc, bibDB, imageDB, includeTemplate = true, token = false) {
        this.doc = doc
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.includeTemplate = includeTemplate
        this.token = token
        return this.init()
    }

    init() {
        const shrinker = new ShrinkFidus(this.doc, this.imageDB, this.bibDB)
        return shrinker
            .init()
            .then(({doc, shrunkImageDB, shrunkBibDB, httpIncludes}) => {
                const zipper = new ZipFidus(
                    this.doc.id,
                    doc,
                    shrunkImageDB,
                    shrunkBibDB,
                    httpIncludes,
                    this.includeTemplate,
                    this.token
                )
                return zipper.init()
            })
            .then(blob =>
                download(
                    blob,
                    createSlug(shortFileTitle(this.doc.title, this.doc.path)) +
                        ".fidus",
                    "application/fidus+zip"
                )
            )
    }
}
