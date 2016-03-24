import {savecopy} from "./es6_modules/exporter/copy"
import {downloadFile} from "./es6_modules/exporter/download"
import {downloadEpub} from "./es6_modules/exporter/epub"
import {downloadHtml} from "./es6_modules/exporter/html"
import {downloadLatex} from "./es6_modules/exporter/latex"
import {downloadNative} from "./es6_modules/exporter/native"
import {createSlug, findImages} from "./es6_modules/exporter/tools"
import {zipFileCreator} from "./es6_modules/exporter/zip"


/**
 * Functions to export the Fidus Writer document.
 */
let exporter = {
    savecopy, downloadFile,
    downloadEpub, downloadHtml, downloadLatex,
    downloadNative, createSlug,
    findImages, zipFileCreator
}

window.exporter = exporter
