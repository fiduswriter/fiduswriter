import download from "downloadjs"

import {obj2Node, node2Obj} from "../tools/json"
import {createSlug} from "../tools/file"
import {modifyImages} from "../tools/html"
import {ZipFileCreator} from "../tools/zip"
import {opfTemplate, containerTemplate, ncxTemplate, navTemplate, xhtmlTemplate} from "./templates"
import {addAlert} from "../../common"
import {BaseEpubExporter} from "./base"
import {removeHidden} from "../tools/doc_contents"


export class EpubExporter extends BaseEpubExporter {

    constructor(schema, doc, bibDB, imageDB, citationStyles, citationLocales, staticUrl) {
        super(schema)
        this.doc = doc
        this.citationStyles = citationStyles
        this.citationLocales = citationLocales
        this.bibDB = bibDB
        this.imageDB = imageDB
        this.staticUrl = staticUrl
        this.shortLang = this.doc.settings.language.split('-')[0]
        this.lang = this.doc.settings.language
    }

    init() {
        addAlert('info', this.doc.title + ': ' + gettext(
            'Epub export has been initiated.'))
        this.docContents = removeHidden(this.doc.contents, false)
        this.joinDocumentParts().then(
            () => this.fillToc()
        ).then(
            () => this.exportTwo()
        )
    }

    exportTwo() {
        const styleSheets = [] //TODO: fill style sheets with something meaningful.
        const title = this.doc.title

        let contents = this.contents

        contents = this.addFigureNumbers(contents)

        const images = modifyImages(contents)

        const contentsBody = document.createElement('body')

        while (contents.firstChild) {
            contentsBody.appendChild(contents.firstChild)
        }

        const equations = contentsBody.querySelectorAll('.equation, .figure-equation')

        const math = equations.length ? true : false

        // Make links to all H1-3 and create a TOC list of them
        const contentItems = this.orderLinks(this.setLinks(
            contentsBody))

        const contentsBodyEpubPrepared = this.styleEpubFootnotes(
            contentsBody)

        let xhtmlCode = xhtmlTemplate({
            part: false,
            shortLang: this.shortLang,
            title,
            styleSheets,
            math,
            body: obj2Node(node2Obj(contentsBodyEpubPrepared), 'xhtml').innerHTML
        })

        xhtmlCode = this.replaceImgSrc(xhtmlCode)

        const containerCode = containerTemplate({})

        const timestamp = this.getTimestamp()


        const authors = this.docContents.content.reduce(
            (authors, part) => {
                if (part.type==='contributors_part' && part.attrs.metadata === 'authors') {
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
        const keywords = this.docContents.content.reduce(
            (keywords, part) => {
                if (part.type==='tags_part' && part.attrs.metadata === 'keywords') {
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
            date: timestamp.slice(0, 10), // TODO: the date should probably be the original document creation date instead
            modified: timestamp,
            styleSheets,
            math,
            images
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
            contentItems
        })

        const outputList = [{
            filename: 'META-INF/container.xml',
            contents: containerCode
        }, {
            filename: 'EPUB/document.opf',
            contents: opfCode
        }, {
            filename: 'EPUB/document.ncx',
            contents: ncxCode
        }, {
            filename: 'EPUB/document-nav.xhtml',
            contents: navCode
        }, {
            filename: 'EPUB/document.xhtml',
            contents: xhtmlCode
        }]


        for (let i = 0; i < styleSheets.length; i++) {
            const styleSheet = styleSheets[i]
            outputList.push({
                filename: 'EPUB/' + styleSheet.filename,
                contents: styleSheet.contents
            })
        }

        const httpOutputList = []
        for (let i = 0; i < images.length; i++) {
            httpOutputList.push({
                filename: 'EPUB/' + images[i].filename,
                url: images[i].url
            })
        }
        const includeZips = []
        if (math) {
            includeZips.push({
                'directory': 'EPUB',
                'url': `${this.staticUrl}zip/mathlive_style.zip?v=${process.env.TRANSPILE_VERSION}`
            })
        }
        const zipper = new ZipFileCreator(
            outputList,
            httpOutputList,
            includeZips,
            'application/epub+zip'
        )

        zipper.init().then(
            blob => download(blob, createSlug(title) + '.epub', 'application/epub+zip')
        )

    }
}
