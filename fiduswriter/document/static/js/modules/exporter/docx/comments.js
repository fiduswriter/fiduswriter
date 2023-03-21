import {noSpaceTmp, escapeText} from "../../common"
import {descendantNodes} from "../tools/doc_content"

const DEFAULT_COMMENTS_XML = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n" + noSpaceTmp`
    <w:comments xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:w10="urn:schemas-microsoft-com:office:word" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" mc:Ignorable="w14 wp14 w15">
    </w:comments>
    `

const DEFAULT_COMMENTS_EXTENDED_XML = "<?xml version=\"1.0\" encoding=\"UTF-8\" standalone=\"yes\"?>\n" + noSpaceTmp`
    <w15:commentsEx xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" mc:Ignorable="w15">
    </w15:commentsEx>
    `


export class DocxExporterComments {
    constructor(exporter, commentsDB, docContent) {
        this.exporter = exporter
        this.commentsDB = commentsDB
        this.docContent = docContent
        this.comments = {}
        this.commentsXml = false
        this.commentsExtendedXml = false
        this.commentsFilePath = "word/comments.xml"
        this.commentsExtendedFilePath = "word/commentsExtended.xml"
        this.maxCommentId = -1
    }

    init() {
        this.exporter.rels.addCommentsRel()
        return Promise.all([
            this.exporter.xml.getXml(this.commentsFilePath, DEFAULT_COMMENTS_XML).then(commentsXml => this.commentsXml = commentsXml),
            this.exporter.xml.getXml(this.commentsExtendedFilePath, DEFAULT_COMMENTS_EXTENDED_XML).then(commentsExtendedXml => this.commentsExtendedXml = commentsExtendedXml)
        ]).then(
            () => {
                Array.from(this.commentsXml.querySelectorAll('comment')).forEach(
                    el => {
                        const id = parseInt(el.getAttribute('w:id'))
                        if (id > this.maxCommentId) {
                            this.maxCommentId = id
                        }
                    }
                )
                return this.exportComments()
            }
        )
    }

    addComment(id) {
        const commentId = ++this.maxCommentId
        this.comments[id] = commentId
        const commentDBEntry = this.commentsDB[id]
        const comments = this.commentsXml.querySelector("comments")
        let string = `<w:comment w:id="${commentId}" w:author="${escapeText(commentDBEntry.username)}" w:date="${new Date(commentDBEntry.date).toISOString()}" w:initials="">`
        string += commentDBEntry.comment.map(node => this.exporter.richtext.transformRichtext(node)).join("")
        string += `</w:comment>`
        commentDBEntry.answers.forEach(answer => {
            const answerId = ++this.maxCommentId
            string += `<w:comment w:id="${answerId}" w:author="${escapeText(answer.username)}" w:date="${new Date(answer.date).toISOString()}" w:initials="">`
            string += answer.answer.map(node => this.exporter.richtext.transformRichtext(node)).join("")
            string += `</w:comment>`
        })
        comments.insertAdjacentHTML("beforeEnd", string)
    }

    exportComments() {
        const usedComments = []
        descendantNodes(this.docContent).forEach(
            node => {
                if (node.marks) {
                    const comment = node.marks.find(mark => mark.type === "comment")
                    if (comment && !usedComments.includes(comment.attrs.id)) {
                        usedComments.push(comment.attrs.id)
                    }
                }
            }
        )
        usedComments.forEach((comment) => {
            this.addComment(comment)
        })
        return Promise.resolve()
    }

}
