import {modelToEditor} from "../editor/node-convert"
import {downloadFile} from "./download"
import {createSlug} from "./tools"
import {BibliographyDB} from "../bibliography/database"
import {FormatCitations} from "../citations/format"
import {fidusSchema} from "../editor/schema"

import Docxtemplater from "docxtemplater"
import LinkModule from "docxtemplater-link-module"
import LinkManager from "docxtemplater-link-module/src/linkManager"
import JSZipUtils from "jszip-utils"

/*
Exporter to Microsoft Word.

This exporter is *very* experimental. Do not count on using it unless you
have the time to fix it.

TODO:
* figures
* footnotes
* equations
*/

export class WordExporter {
    constructor(doc, bibDB) {
        let that = this
        this.doc = doc
        // We use the doc in the pm format as this is what we will be using
        // throughout the application in the future.
        this.pmDoc = modelToEditor(this.doc)
        this.template = false
        this.wdoc = false
        this.citInfos = []
        this.citFm = false
        this.pmCits = []
        this.docData = {}
        if (bibDB) {
            this.bibDB = bibDB // the bibliography has already been loaded for some other purpose. We reuse it.
            this.exporter()
        } else {
            this.bibDB = new BibliographyDB(doc.owner.id, false, false, false)
            this.bibDB.getDB(function() {
                that.exporter()
            })
        }
    }

    getTemplate(callback) {
        let that = this
        JSZipUtils.getBinaryContent(
            staticUrl + 'docx/template.docx',
            function(err, template){
                that.template = template
                callback()
            }
        )
    }

    exporter() {
        let that = this
        this.formatCitations()

        this.getTemplate(function(){
            that.wdoc = new Docxtemplater(that.template)
            that.linkManager = new LinkManager(that.wdoc.zip, 'document')
            that.linkManager.loadLinkRels()
            that.getDocData()
            that.prepareAndDownload()
        })
    }

    // Citations are highly interdependent -- so we need to format them all
    // together before laying out the document.
    formatCitations() {
        let that = this
        this.pmDoc.descendants(
            function(node){
                if (node.type.name==='citation') {
                    that.citInfos.push(node.attrs)
                }
            }
        )
        this.citFm = new FormatCitations(
            this.citInfos,
            this.doc.settings.citationstyle,
            this.bibDB,
            function() {
                that.formatCitationsTwo()
            }
        )
        this.citFm.init()
    }

    formatCitationsTwo() {
        // There could be some formatting in the citations, so we parse them through the PM schema for final formatting.
        // We need to put the citations each in a paragraph so that it works with
        // the fiduswriter schema and so that the converter doesn't mash them together.
        let citationsHTML = ''
        this.citFm.citationTexts.forEach(function(ct){
            citationsHTML += '<p>'+ct[0][1]+'</p>'
        })

        // We create a standard document DOM node, add the citations
        // into the last child (the body) and parse it back.
        let dom = fidusSchema.parseDOM(document.createTextNode('')).toDOM()
        dom.lastElementChild.innerHTML = citationsHTML
        this.pmCits = fidusSchema.parseDOM(dom).lastChild.toJSON().content

        // Now we do the same for the bibliography.
        dom = fidusSchema.parseDOM(document.createTextNode('')).toDOM()
        dom.lastElementChild.innerHTML = this.citFm.bibliographyHTML
        // Remove empty bibliography header (used in web version)
        dom.lastElementChild.removeChild(dom.lastElementChild.firstElementChild)
        this.pmBib = fidusSchema.parseDOM(dom).lastChild.toJSON()
        // use the References style for the paragraphs in the bibliography
        this.pmBib.type = 'bibliography'
    }

    getDocData() {
        this.docData = {
            title: this.pmDoc.child(0).textContent,
            subtitle: this.pmDoc.child(1).textContent,
            authors: this.pmDoc.child(2).textContent,
            abstract: this.transformRichtext(this.pmDoc.child(3).toJSON()),
            keywords: this.pmDoc.child(4).textContent,
            body: this.transformRichtext(this.pmDoc.child(5).toJSON()),
            bibliography: this.transformRichtext(this.pmBib)
        }
    }

    prepareAndDownload() {
        this.wdoc.setData(this.docData)
        this.wdoc.render()
        let out = this.wdoc.getZip().generate({type:"blob"})
        downloadFile(createSlug(this.docData.title)+'.docx', out)
    }

    escapeText(text) {
		return text
            .replace(/"/g, '&quot;')
            .replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
    }

    transformRichtext(node, options = {}) {
        let start = '', content = '', end = ''

        switch(node.type) {
            case 'body':
                options = _.clone(options)
                options.section = 'Normal'
                break
            case 'abstract':
                options = _.clone(options)
                options.section = 'Abstract'
                break
            case 'bibliography':
                options = _.clone(options)
                options.section = 'References'
                break
            case 'paragraph':
                // This should really be something like
                // '<w:p w:rsidR="A437D321" w:rsidRDefault="2B935ADC">'
                // See: https://blogs.msdn.microsoft.com/brian_jones/2006/12/11/whats-up-with-all-those-rsids/
                // But tests with Word 2016/LibreOffice seem to indicate that it
                // doesn't care if the attributes are missing.
                // We may need to add them later, if it turns out this is a problem
                // for other versions of Word. In that case we should also add
                // it to settings.xml as described in above link.
                start += '<w:p>'
                start += '<w:pPr><w:pStyle w:val="'+options.section+'"/>'
                if (options.list_type) {
                    start += '<w:numPr><w:ilvl w:val="'+options.list_depth+'"/>'
                    start += '<w:numId w:val="'+options.list_type+'"/></w:numPr>'
                } else {
                    start += '<w:rPr></w:rPr>'
                }
                start += '</w:pPr>'
                end += '</w:p>'
                break
            case 'heading':
                start += '<w:p>'
                start += '<w:pPr><w:pStyle w:val="Heading'+node.attrs.level+'"/><w:rPr></w:rPr></w:pPr>'
                end += '</w:p>'
                break
            case 'code':
                start += '<w:p>'
                start += '<w:pPr><w:pStyle w:val="Code"/><w:rPr></w:rPr></w:pPr>'
                end += '</w:p>'
                break
            case 'blockquote':
                // This is imperfect, but Word doesn't seem to provide section/quotation nesting
                options = _.clone(options)
                options.section = 'Quote'
                break
            case 'ordered_list':
                options = _.clone(options)
                options.section = 'ListParagraph'
                options.list_type = '1'
                if (options.list_depth === undefined) {
                    options.list_depth = 0
                } else {
                    options.list_depth = 1
                }
                break
            case 'bullet_list':
                options = _.clone(options)
                options.section = 'ListParagraph'
                options.list_type = '2'
                if (options.list_depth === undefined) {
                    options.list_depth = 0
                } else {
                    options.list_depth = 1
                }
                break
            case 'list_item':
                // Word seems to lack complex nesting options. The styling is applied
                // to child paragraphs. This will deliver correct results in most
                // cases.
                break
            case 'text':
                // Check for hyperlink, bold/strong and italic/em
                let hyperlink, strong, em
                if (node.marks) {
                    strong = _.findWhere(node.marks, {_:'strong'})
                    em = _.findWhere(node.marks, {_:'em'})
                    hyperlink = _.findWhere(node.marks, {_:'link'})
                }

                if (hyperlink) {
                    let refId = this.linkManager.addLinkRels(
                        hyperlink.title,
                        hyperlink.href
                    )
                    start += `<w:hyperlink r:id="rId${refId}"><w:r>`
                    end += '</w:t></w:r></w:hyperlink>'
                } else {
                    start += '<w:r>'
                    end += '</w:t></w:r>'
                }

                if (hyperlink || strong || em) {
                    start += '<w:rPr>'
                    if (strong) {
                        start += '<w:b/><w:bCs/>'
                    }
                    if (em) {
                        start += '<w:i/><w:iCs/>'
                    }
                    if (hyperlink) {
                        start += '<w:rStyle w:val="Hyperlink"/>'
                    }
                    start += '</w:rPr>'
                }
                let textAttr = ''
                if (node.text[0] === ' ' || node.text[node.text.length-1] === ' ') {
                    textAttr += 'xml:space="preserve"'
                }
                start += `<w:t ${textAttr}>`

                content += this.escapeText(node.text)
                break
            case 'citation':
                // We take the first citation from the stack and remove it.
                let cit = this.pmCits.shift()
                for (let i=0; i < cit.content.length; i++) {
                    content += this.transformRichtext(cit.content[i], options)
                }
                break
            default:
                console.warn('Unhandled node type:' + node.type)
                break
        }

        if (node.content) {
            for (let i=0; i < node.content.length; i++) {
                content += this.transformRichtext(node.content[i], options)
            }
        }

        return start + content + end
    }

}
