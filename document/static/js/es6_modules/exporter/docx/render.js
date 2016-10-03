import {textContent} from "../tools/pmJSON"
import {escapeText} from "../tools/html"

export class DocxExporterRender {
    constructor(exporter, pmJSON) {
        this.exporter = exporter
        this.pmJSON = pmJSON
        this.filePath = "word/document.xml"
        this.xml = false
    }

    init() {
        let that = this
        return this.exporter.xml.getXml(this.filePath).then(
            function(xml) {
                that.xml = xml
            }
        )
    }

    // Define the tags that are to be looked for in the document
    getTagData(pmBib) {

        this.tags = [
            {
                title: 'title',
                content: textContent(this.pmJSON.content[0])
            },
            {
                title: 'subtitle',
                content: textContent(this.pmJSON.content[1])
            },
            {
                title: 'authors',
                content: textContent(this.pmJSON.content[2])
            },
            {
                title: '@abstract', // The '@' triggers handling as block
                content: this.pmJSON.content[3]
            },
            {
                title: 'keywords',
                content: textContent(this.pmJSON.content[4])
            },
            {
                title: '@body', // The '@' triggers handling as block
                content: this.pmJSON.content[5]
            },
            {
                title: '@bibliography', // The '@' triggers handling as block
                content: pmBib ? pmBib : {type: 'paragraph', contents: [{type:'text', text: ' '}]}
            }
        ]
    }

    // go through document.xml looking for tags and replace them with the given
    // replacements.
    render() {

        let pars = [].slice.call(this.xml.querySelectorAll('p,sectPr')) // Including global page definition at end
        let currentTags = [], that = this

        pars.forEach(function(par){
            let text = par.textContent // Assuming there is nothing outside of <w:t>...</w:t>
            that.tags.forEach(function(tag){
                let tagString = tag.title
                if(text.indexOf('{'+tagString+'}') !== -1) {
                    currentTags.push(tag)
                    tag.par = par
                    // We don't worry about the same tag appearing twice in the document,
                    // as that would make no sense.
                }
            })

            let pageSize = par.querySelector('pgSz')
            let pageMargins = par.querySelector('pgMar')
            let cols = par.querySelector('cols')
            if (pageSize && pageMargins && cols) { // Not sure if these all need to come together
                let width = parseInt(pageSize.getAttribute('w:w')) -
                parseInt(pageMargins.getAttribute('w:right')) -
                parseInt(pageMargins.getAttribute('w:left'))
                let height = parseInt(pageSize.getAttribute('w:h')) -
                parseInt(pageMargins.getAttribute('w:bottom')) -
                parseInt(pageMargins.getAttribute('w:top')) -
                parseInt(pageMargins.getAttribute('w:header')) -
                parseInt(pageMargins.getAttribute('w:footer'))

                let colCount = parseInt(cols.getAttribute('w:num'))
                if (colCount > 1) {
                    let colSpace = parseInt(cols.getAttribute('w:space'))
                    width = width - (colSpace * (colCount-1))
                    width = width / colCount
                }
                while (currentTags.length) {
                    let tag = currentTags.pop()
                    tag.dimensions = {
                        width: width * 635, // convert to EMU
                        height: height * 635 // convert to EMU
                    }
                }

            }

        })
        this.tags.forEach(function(tag){
            if(tag.title[0]==='@') {
                that.parRender(tag)
            } else {
                that.inlineRender(tag)
            }
        })
    }

    // Render Tags that only exchange inline content
    inlineRender(tag) {
        let texts = tag.par.textContent.split('{'+tag.title+'}')
        let fullText = texts[0] + escapeText(tag.content) + texts[1]
        let rs = [].slice.call(tag.par.querySelectorAll('r'))
        while (rs.length > 1) {
            rs[0].parentNode.removeChild(rs[0])
            rs.shift()
        }
        let r = rs[0]
        r.innerHTML = '<w:t>' + fullText + '</w:t>'
    }

    // Render tags that exchange paragraphs
    parRender(tag) {
        let outXML = this.exporter.richtext.transformRichtext(
            tag.content,
            {
                dimensions: tag.dimensions,
                citationType: this.exporter.citations.citFm.citationType
            }
        )
        tag.par.insertAdjacentHTML('beforebegin', outXML)
        // sectPr contains information about columns, etc. We need to move this
        // to the last paragraph we will be adding.
        let sectPr = tag.par.querySelector('sectPr')
        if (sectPr) {
            let pPr = tag.par.previousElementSibling.querySelector('pPr')
            pPr.appendChild(sectPr)
        }
        tag.par.parentNode.removeChild(tag.par)
    }


}
