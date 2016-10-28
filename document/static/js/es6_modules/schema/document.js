import {BlockQuote, OrderedList, BulletList, ListItem, HorizontalRule,
        Paragraph, Heading, CodeBlock, Image, HardBreak, CodeMark, EmMark,
        StrongMark, LinkMark} from "prosemirror-old/dist/schema-basic"
import {Table, TableRow, TableCell} from "prosemirror-old/dist/schema-table"
import {Schema, Block, Inline, Text, Attribute, MarkType} from "prosemirror-old/dist/model"
import {elt} from "prosemirror-old/dist/util/dom"
import {katexRender} from "../katex/katex"
import {htmlToFnNode, fnNodeToHtml} from "./footnotes-convert"
import {Figure, Citation, Equation} from "./common"

class Doc extends Block {
    get matchDOMTag() {
        return {"div.ProseMirror-content": null}
    }
    toDOM(node) {
        return ["div", {class: 'ProseMirror-content'}, 0]
    }
}

class Title extends Block {
    get matchDOMTag() {
        return {"div[id='document-title']": null}
    }
    toDOM(node) {
        return ["div", {id: 'document-title'}, 0]
    }
}

class Subtitle extends Block {
    get matchDOMTag() {
        return {"div[id='metadata-subtitle']": null}
    }
    toDOM(node) {
        return ["div", {id: 'metadata-subtitle'}, 0]
    }
}

class Authors extends Block {
    get matchDOMTag() {
        return {"div[id='metadata-authors']": null}
    }
    toDOM(node) {
        return ["div", {id: 'metadata-authors'}, 0]
    }
}

class Abstract extends Block {
    get matchDOMTag() {
        return {"div[id='metadata-abstract']": null}
    }
    toDOM(node) {
        return ["div", {id: 'metadata-abstract'}, 0]
    }
}

class Keywords extends Block {
    get matchDOMTag() {
        return {"div[id='metadata-keywords']": null}
    }
    toDOM(node) {
        return ["div", {id: 'metadata-keywords'}, 0]
    }
}

class Body extends Block {
    get matchDOMTag() {
        return {"div[id='document-contents']": null}
    }
    toDOM(node) {
        return ["div", {id: 'document-contents'}, 0]
    }
}


class Footnote extends Inline {
    get attrs() {
        return {
            footnote: new Attribute({
                default: [{type:'paragraph'}]
            }),
        }
    }
    get matchDOMTag() {
        return {
            // To support import from FW 1.1-3.0
            "span.footnote": dom => ({
                footnote: htmlToFnNode(dom.innerHTML)
            }),
            "span.footnote-marker[contents]": dom => ({
                footnote: htmlToFnNode(dom.getAttribute('contents'))
            }),
            // Current FW
            "span.footnote-marker[data-footnote]": dom => ({
                footnote: htmlToFnNode(dom.getAttribute('data-footnote'))
            })
        }
    }
    toDOM(node) {
        let dom = elt("span", {
            class: 'footnote-marker',
            'data-footnote': fnNodeToHtml(node.attrs.footnote)
        })
        dom.innerHTML = '&nbsp;'
        return dom
    }
}


class CommentMark extends MarkType {
    get attrs() {
        return {
            id: new Attribute()
        }
    }
    get inclusiveRight() {
        return false
    }
    get matchDOMTag() {
        return {"span.comment[data-id]": dom => ({
            id: dom.getAttribute("data-id")
        })}
    }
    toDOM(node) {
        return ['span', {class: 'comment', 'data-id': node.attrs.id}]
    }
}

export const docSchema = new Schema({
  nodes: {
    doc: {type: Doc, content: "title subtitle authors abstract keywords body"},
    title: {type: Title, content: "text*", group: "part"},
    subtitle: {type: Subtitle, content: "text*", group: "part"},
    authors: {type: Authors, content: "text*", group: "part"},
    abstract: {type: Abstract, content: "(block | table_block)+", group: "part"},
    keywords: {type: Keywords, content: "text*", group: "part"},
    body: {type: Body, content: "(block | table_block)+", group: "part"},

    paragraph: {type: Paragraph, content: "inline<_>*", group: "block"},
    blockquote: {type: BlockQuote, content: "block+", group: "block"},
    ordered_list: {type: OrderedList, content: "list_item+", group: "block"},
    bullet_list: {type: BulletList, content: "list_item+", group: "block"},
    list_item: {type: ListItem, content: "block+", group: "block"},
    horizontal_rule: {type: HorizontalRule, group: "block"},
    figure: {type: Figure, group: "block"},

    heading: {type: Heading, content: "inline<_>*", group: "block"},
    code_block: {type: CodeBlock, content: "text*", group: "block"},

    text: {type: Text, group: "inline"},
    hard_break: {type: HardBreak, group: "inline"},
    citation: {type: Citation, group: "inline"},
    equation: {type: Equation, group: "inline"},
    footnote: {type: Footnote, group: "inline"},

    table: {type: Table, content: "table_row[columns=.columns]+", group:  "table_block"},
    table_row: {type: TableRow, content: "table_cell{.columns}"},
    table_cell: {type: TableCell, content: "block+"}

  },
  marks: {
    em: EmMark,
    strong: StrongMark,
    link: LinkMark,
    code: CodeMark,
    comment: CommentMark
  }
})
