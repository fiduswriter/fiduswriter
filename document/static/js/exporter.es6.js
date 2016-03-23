import {savecopy} from "./es6_modules/exporter/copy"
import {downloadFile} from "./es6_modules/exporter/download"
import {styleEpubFootnotes, getTimestamp, downloadEpub, setLinks, orderLinks} from "./es6_modules/exporter/epub"
import {downloadHtml, cleanHTML, addFigureNumbers, replaceImgSrc} from "./es6_modules/exporter/html"
import {obj2Node, node2Obj} from "./es6_modules/exporter/json"
import {findLatexDocumentFeatures, htmlToLatex, downloadLatex} from "./es6_modules/exporter/latex"
import {downloadNative} from "./es6_modules/exporter/native"
import {createSlug, findImages} from "./es6_modules/exporter/tools"
import {zipFileCreator} from "./es6_modules/exporter/zip"

import {opfKatexItemsTemplatePart, opfCssItemTemplatePart,
  opfImageItemTemplatePart, opfTemplate, containerTemplate, ncxTemplate,
  ncxItemTemplate, xhtmlTemplate, navTemplate, navItemTemplate
  } from "./es6_modules/exporter/epub-templates"

/**
 * Functions to export the Fidus Writer document.
 */
let exporter = {
    opfKatexItemsTemplatePart, opfCssItemTemplatePart, opfImageItemTemplatePart,
    opfTemplate, containerTemplate, ncxTemplate, ncxItemTemplate, xhtmlTemplate,
    navTemplate, navItemTemplate, savecopy, downloadFile, styleEpubFootnotes,
    getTimestamp, downloadEpub, setLinks, orderLinks, downloadHtml, cleanHTML,
    addFigureNumbers, replaceImgSrc, obj2Node, node2Obj, downloadLatex,
    findLatexDocumentFeatures, htmlToLatex, downloadNative, createSlug,
    findImages, zipFileCreator
}

window.exporter = exporter
