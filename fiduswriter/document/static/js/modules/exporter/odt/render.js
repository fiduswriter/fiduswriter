import {textContent} from "../tools/doc_content"
import {escapeText} from "../../common"
import {BIBLIOGRAPHY_HEADERS} from "../../schema/i18n"

export class ODTExporterRender {
    constructor(docContent, settings, xml, richtext, citations) {
        this.docContent = docContent
        this.settings = settings
        this.xml = xml
        this.richtext = richtext
        this.citations = citations

        this.filePath = "content.xml"
        this.text = false
    }

    init() {
        return this.xml.getXml(this.filePath).then(
            xml => {
                this.xml = xml
                this.text = xml.querySelector("text")
                return Promise.resolve()
            }
        )
    }

    // Define the tags that are to be looked for in the document
    getTagData(pmBib) {
        this.tags = this.docContent.content.map(node => {
            const tag = {}
            switch (node.type) {
            case "title":
                tag.title = "title"
                tag.content = textContent(node)
                break
            case "heading_part":
                tag.title = node.attrs.id
                tag.content = textContent(node)
                break
            case "table_part":
            case "richtext_part":
                tag.title = `@${node.attrs.id}`
                tag.content = node.content
                break
            case "contributors_part":
                tag.title = node.attrs.id
                // TODO: This is a very basic reduction of the author info into
                // a simple string. We should expand the templating system so
                // that one can specify more about the output.
                tag.content = node.content ?
                    node.content.map(
                        node => {
                            const contributor = node.attrs,
                                nameParts = []
                            let affiliation = false
                            if (contributor.firstname) {
                                nameParts.push(contributor.firstname)
                            }
                            if (contributor.lastname) {
                                nameParts.push(contributor.lastname)
                            }
                            if (contributor.institution) {
                                if (nameParts.length) {
                                    affiliation = contributor.institution
                                } else {
                                    // We have an institution but no names. Use institution as name.
                                    nameParts.push(contributor.institution)
                                }
                            }
                            const parts = [nameParts.join(" ")]
                            if (affiliation) {
                                parts.push(affiliation)
                            }
                            if (contributor.email) {
                                parts.push(contributor.email)
                            }
                            return parts.join(", ")
                        }
                    ).join("; ") :
                    ""
                break
            case "tags_part":
                tag.title = node.attrs.id
                tag.content = node.content ?
                    node.content.map(node => node.attrs.tag).join(", ") :
                    ""
                break
            }
            return tag
        })
        const settings = this.settings,
            bibliographyHeader = settings.bibliography_header[settings.language] || BIBLIOGRAPHY_HEADERS[settings.language]
        this.tags.push({
            title: "@bibliography", // The '@' triggers handling as block
            content: pmBib ?
                [{type: "bibliography_heading", content: [{type: "text", text: bibliographyHeader}]}].concat(pmBib.content) :
                [{type: "paragraph", content: [{type: "text", text: " "}]}]
        })
        this.tags.push({
            title: "@copyright", // The '@' triggers handling as block
            content: settings.copyright && settings.copyright.holder ?
                [{type: "paragraph", content: [{type: "text", text: `© ${settings.copyright.year ? settings.copyright.year : new Date().getFullYear()} ${settings.copyright.holder}`}]}] :
                [{type: "paragraph", content: [{type: "text", text: " "}]}]
        })
        this.tags.push({
            title: "@licenses", // The '@' triggers handling as block
            content: settings.copyright && settings.copyright.licenses.length ?
                settings.copyright.licenses.map(
                    license => ({type: "paragraph", content: [
                        {type: "text", marks: [{type: "link", attrs: {href: license.url, title: license.url}}], text: license.title},
                        {type: "text", text: license.start ? ` (${license.start})` : ""}
                    ]})
                ) :
                [{type: "paragraph", content: [{type: "text", text: " "}]}]
        })
    }

    // go through content.xml looking for tags and replace them with the given
    // replacements.
    render() {
        const textBlocks = this.text.querySelectorAll("p, h")
        textBlocks.forEach(block => {
            if (block.parentNode.nodeName === "text:deletion") {
                // Inside of tracked changes deletion, don't do anything
                return
            }
            const text = block.textContent
            this.tags.forEach(tag => {
                const tagString = tag.title
                if (text.includes(`{${tagString}}`)) {
                    tag.block = block
                    if (tag.title[0] === "@") {
                        this.blockRender(tag)
                    } else {
                        this.inlineRender(tag)
                    }
                }
            })
        })
    }

    // Render Tags that only exchange inline content
    inlineRender(tag) {
        const texts = tag.block.textContent.split(`{${tag.title}}`)
        const fullText = texts[0] + (tag.content ? tag.content : "") + texts[1]
        tag.block.innerHTML = escapeText(fullText).replace(
            /^\s+|\s+$/g,
            match => "<text:s/>".repeat(match.length))
    }

    // Render tags that exchange text blocks
    blockRender(tag) {
        const section = tag.block.hasAttribute("text:style-name") ? tag.block.getAttribute("text:style-name") : "Text_20_body"
        const outXml = tag.content ? tag.content.map(
            (content, contentIndex) => this.richtext.run(
                content,
                {
                    citationType: this.citations.citFm.citationType,
                    section,
                    tag: tag.title.slice(1)
                },
                tag,
                contentIndex
            )
        ).join("") : ""
        tag.block.insertAdjacentHTML("beforebegin", outXml)
        tag.block.parentNode.removeChild(tag.block)
    }


}
