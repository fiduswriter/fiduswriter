import {savecopy} from "./es6_modules/exporter/copy"
import {downloadFile} from "./es6_modules/exporter/download"
import {styleEpubFootnotes, getTimestamp, downloadEpub, setLinks, orderLinks} from "./es6_modules/exporter/epub"
import {downloadHtml, cleanHTML, replaceImgSrc, getMathjaxHeader} from "./es6_modules/exporter/html"
import {obj2Node, node2Obj} from "./es6_modules/exporter/json"
import {findLatexDocumentFeatures, htmlToLatex, downloadLatex} from "./es6_modules/exporter/latex"
import {uploadNative, downloadNative} from "./es6_modules/exporter/native"
import {createSlug, findImages} from "./es6_modules/exporter/tools"
import {zipFileCreator} from "./es6_modules/exporter/zip"

import {opfMathjaxItemsTemplatePart, opfCssItemTemplatePart,
  opfImageItemTemplatePart, opfTemplate, containerTemplate, ncxTemplate,
  ncxItemTemplate, xhtmlTemplate, navTemplate, navItemTemplate
  } from "./es6_modules/exporter/epub-templates"

import {mathjaxHtmlHeaderTemplatePart, htmlExportTemplate} from "./es6_modules/exporter/html-templates"

/**
 * Functions to export the Fidus Writer document.
 */
let exporter = {}
exporter.opfMathjaxItemsTemplatePart = opfMathjaxItemsTemplatePart
exporter.opfCssItemTemplatePart = opfCssItemTemplatePart
exporter.opfImageItemTemplatePart = opfImageItemTemplatePart
exporter.opfTemplate = opfTemplate
exporter.containerTemplate = containerTemplate
exporter.ncxTemplate = ncxTemplate
exporter.ncxItemTemplate = ncxItemTemplate
exporter.xhtmlTemplate = xhtmlTemplate
exporter.navTemplate = navTemplate
exporter.navItemTemplate = navItemTemplate
exporter.mathjaxHtmlHeaderTemplatePart = mathjaxHtmlHeaderTemplatePart
exporter.htmlExportTemplate = htmlExportTemplate
exporter.savecopy = savecopy
exporter.downloadFile = downloadFile
exporter.styleEpubFootnotes = styleEpubFootnotes
exporter.getTimestamp = getTimestamp
exporter.downloadEpub = downloadEpub
exporter.setLinks = setLinks
exporter.orderLinks = orderLinks
exporter.downloadHtml = downloadHtml
exporter.cleanHTML = cleanHTML
exporter.replaceImgSrc = replaceImgSrc
exporter.getMathjaxHeader = getMathjaxHeader
exporter.obj2Node = obj2Node
exporter.node2Obj = node2Obj
exporter.findLatexDocumentFeatures = findLatexDocumentFeatures
exporter.htmlToLatex = htmlToLatex
exporter.downloadLatex = downloadLatex
exporter.uploadNative = uploadNative
exporter.downloadNative = downloadNative
exporter.createSlug = createSlug
exporter.findImages = findImages
exporter.zipFileCreator = zipFileCreator

window.exporter = exporter
