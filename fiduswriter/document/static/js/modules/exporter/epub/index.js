import download from "downloadjs"
import pretty from "pretty"

import {obj2Node, node2Obj} from "../tools/json"
import {createSlug} from "../tools/file"
import {modifyImages} from "../tools/html"
import {ZipFileCreator} from "../tools/zip"
import {opfTemplate, containerTemplate, ncxTemplate, navTemplate, xhtmlTemplate} from "./templates"
import {addAlert} from "../../common"
import {styleEpubFootnotes, getTimestamp, setLinks, orderLinks, addCategoryLabels} from "./tools"
import {removeHidden} from "../tools/doc_content"
import {DOMExporter} from "../tools/dom_export"

export class EpubExporter extends DOMExporter {

    constructor(schema, csl, documentStyles, doc, bibDB, imageDB, updated) {
        super(schema, csl, documentStyles)
        this.doc = doc
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.updated = updated

        this.shortLang = this.doc.settings.language.split('-')[0]
        this.lang = this.doc.settings.language

        this.outputList = []
        this.includeZips = []
    }

    init() {
        addAlert('info', this.doc.title + ': ' + gettext(
            'Epub export has been initiated.'))
        this.docContent = removeHidden(this.doc.content, false)
        this.addDocStyle(this.doc)

        return this.loadStyles().then(
            () => this.joinDocumentParts()
        ).then(
            () => this.fillToc()
        ).then(
            () => this.save()
        )
    }

    addCategoryLabels(language) {
        addCategoryLabels(this.content.querySelector('section.fnlist'), language, true)
        addCategoryLabels(this.content, language)
    }

    save() {
        const title = this.doc.title

        const contents = this.content

        const images = modifyImages(contents)

        const contentsBody = document.createElement('body')

        while (contents.firstChild) {
            contentsBody.appendChild(contents.firstChild)
        }

        const equations = contentsBody.querySelectorAll('.equation, .figure-equation')

        const math = equations.length ? true : false
        // Make links to all H1-3 and create a TOC list of them
        const contentItems = orderLinks(setLinks(
            contentsBody))

        const contentsBodyEpubPrepared = styleEpubFootnotes(
            contentsBody)

        let xhtmlCode = xhtmlTemplate({
            currentPart: false,
            part: false,
            shortLang: this.shortLang,
            title,
            styleSheets: this.styleSheets,
            math,
            body: obj2Node(node2Obj(contentsBodyEpubPrepared), 'xhtml').innerHTML
        })

        xhtmlCode = this.replaceImgSrc(xhtmlCode)

        const containerCode = containerTemplate({})
        const timestamp = getTimestamp(this.updated)


        const authors = this.docContent.content.reduce(
            (authors, part) => {
                if (part.type === 'contributors_part' && part.attrs.metadata === 'authors' && part.content) {
                    return authors.concat(part.content.map(
                        authorNode => {
                            const nameParts = []
                            if (authorNode.attrs.firstname) {
                                nameParts.push(authorNode.attrs.firstname)
                            }
                            if (authorNode.attrs.lastname) {
                                nameParts.push(authorNode.attrs.lastname)
                            }
                            if (!nameParts.length && authorNode.attrs.institution) {
                                // We have an institution but no names. Use institution as name.
                                nameParts.push(authorNode.attrs.institution)
                            }
                            return nameParts.join(' ')
                        }
                    ))
                } else {
                    return authors
                }
            },
            [])
        const keywords = this.docContent.content.reduce(
            (keywords, part) => {
                if (part.type === 'tags_part' && part.attrs.metadata === 'keywords' && part.content) {
                    return keywords.concat(part.content.map(keywordNode => keywordNode.attrs.tag))
                } else {
                    return keywords
                }
            },
            [])


        const opfCode = opfTemplate({
            language: this.lang,
            title,
            authors,
            keywords,
            idType: 'fidus',
            id: this.doc.id,
            date: timestamp.slice(0, 10),
            modified: timestamp,
            styleSheets: this.styleSheets,
            math,
            images,
            fontFiles: this.fontFiles,
            copyright: this.doc.settings.copyright
        })

        const ncxCode = ncxTemplate({
            shortLang: this.shortLang,
            title,
            idType: 'fidus',
            id: this.doc.id,
            contentItems
        })

        const navCode = navTemplate({
            shortLang: this.shortLang,
            contentItems,
            styleSheets: this.styleSheets
        })

        this.outputList.push({
            filename: 'META-INF/container.xml',
            contents: pretty(containerCode, {ocd: true})
        }, {
            filename: 'EPUB/document.opf',
            contents: pretty(opfCode, {ocd: true})
        }, {
            filename: 'EPUB/document.ncx',
            contents: pretty(ncxCode, {ocd: true})
        }, {
            filename: 'EPUB/document-nav.xhtml',
            contents: pretty(navCode, {ocd: true})
        }, {
            filename: 'EPUB/document.xhtml',
            contents: pretty(xhtmlCode, {ocd: true})
        })

        this.styleSheets.forEach(styleSheet => {
            this.outputList.push({
                filename: 'EPUB/' + styleSheet.filename,
                contents: styleSheet.contents
            })
        })
        images.forEach(image => {
            this.binaryFiles.push({
                filename: 'EPUB/' + image.filename,
                url: image.url
            })
        })
        this.fontFiles.forEach(font => {
            this.binaryFiles.push({
                filename: 'EPUB/' + font.filename,
                url: font.url
            })
        })

        if (math) {
            this.includeZips.push({
                'directory': 'EPUB/css',
                'url': `${settings_STATIC_URL}zip/mathlive_style.zip?v=${transpile_VERSION}`
            })
        }
        return this.createZip()
    }

    createZip() {
        const zipper = new ZipFileCreator(
            this.outputList,
            this.binaryFiles,
            this.includeZips,
            'application/epub+zip',
            this.updated
        )

        return zipper.init().then(
            blob => this.download(blob)
        )
    }

    download(blob) {
        return download(blob, createSlug(this.doc.title) + '.epub', 'application/epub+zip')
    }
}
