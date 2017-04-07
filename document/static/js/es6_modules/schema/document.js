import {Doc, BlockQuote, OrderedList, BulletList, ListItem, HorizontalRule,
        Paragraph, Heading, CodeBlock, Image, HardBreak, CodeMark, EmMark,
        StrongMark, LinkMark} from "prosemirror-old/dist/schema-basic"
import {Table, TableRow, TableCell} from "prosemirror-old/dist/schema-table"
import {Schema, Block, Inline, Text, Attribute, MarkType} from "prosemirror-old/dist/model"
import {elt} from "prosemirror-old/dist/util/dom"
import {htmlToFnNode, fnNodeToHtml} from "./footnotes-convert"
import {Figure, Citation, Equation} from "./common"
import {defaultDocumentStyle} from "../style/documentstyle-list"
import {defaultCitationStyle} from "../style/citation-definitions"


class Article extends Block {

    get attrs() {
        return {
            papersize: new Attribute({
                default: 'A4'
            }),
            citationstyle: new Attribute({
                default: defaultCitationStyle
            }),
            documentstyle: new Attribute({
                default: defaultDocumentStyle
            })
        }
    }
    get matchDOMTag() {
        return {"div.article": dom => ({
            papersize: dom.getAttribute('data-papersize'),
            citationstyle: dom.getAttribute('data-citationstyle'),
            documentstyle: dom.getAttribute('data-documentstyle')
        })}
    }
    toDOM(node) {
        return ["div", {
            class: 'article',
            'data-papersize': node.attrs.papersize,
            'data-citationstyle': node.attrs.citationstyle,
            'data-documentstyle': node.attrs.documentstyle
        }, 0]
    }
}

class Title extends Block {
    get matchDOMTag() {
        return {"div.article-title": null}
    }
    toDOM(node) {
        return ["div", {
            class: 'article-part article-title'
        }, 0]
    }
}

class Metadata extends Block {
    get isMetadata() {return true}
}

class Subtitle extends Metadata {
    get attrs() {
        return {
            hidden: new Attribute({
                default: true
            })
        }
    }
    get matchDOMTag() {
        return {"div.article-subtitle": dom => ({
            hidden: dom.getAttribute('data-hidden') === "true" ? true : false
        })}
    }
    toDOM(node) {
        return ["div", {
            class: 'article-part metadata article-subtitle',
            'data-hidden': node.attrs.hidden
        }, 0]
    }
}

class Authors extends Metadata {
    get attrs() {
        return {
            hidden: new Attribute({
                default: true
            })
        }
    }
    get matchDOMTag() {
        return {"div.article-authors": dom => ({
            hidden: dom.getAttribute('data-hidden')
        })}
    }
    toDOM(node) {
	//console.log("Authors")
        return ["div", {
            class: 'article-part metadata article-authors',
            'data-hidden': node.attrs.hidden
        }, 0]
    }
}

class Abstract extends Metadata {
    get attrs() {
        return {
            hidden: new Attribute({
                default: true
            })
        }
    }
    get matchDOMTag() {
        return {"div.article-abstract": dom => ({
            hidden: dom.getAttribute('data-hidden')
        })}
    }
    toDOM(node) {
	//console.log("Abstract")
        return ["div", {
            class: 'article-part metadata article-abstract',
            'data-hidden': node.attrs.hidden
        }, 0]
    }
}

class Keywords extends Metadata {
    get attrs() {
        return {
            hidden: new Attribute({
                default: true
            })
        }
    }
    get matchDOMTag() {
        return {"div.article-keywords": dom => ({
            hidden: dom.getAttribute('data-hidden')
        })}
    }
    toDOM(node) {
	//console.log("keywords")
        return ["div", {
            class: 'article-part metadata article-keywords',
            'data-hidden': node.attrs.hidden
        }, 0]
    }
}

class Body extends Block {
    get matchDOMTag() {
        return {"div.article-body": null}
    }
    toDOM(node) {
	//console.log("Body")
        return ["div", {
            class: 'article-part article-body'
        }, 0]
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
	//console.log("Footnote")
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

class InternalMark extends MarkType {

    get attrs() {
        return {
            id: new Attribute({default: 1}),
            href: new Attribute,
            title: new Attribute({default: ""})

        }
    }
    get inclusiveRight() {
        return false
    }
    get matchDOMTag() {
    return {"a[href]": dom => ({
      href: dom.getAttribute("href"), title: dom.getAttribute("title")
    })}
    }
    toDOM(node) {

                  return ["a", node.attrs]
                }

}

export const docSchema = new Schema({
  nodes: {
    doc: {type: Doc, content: "article"}, // Transformations don't work well on the top most element
    article: {type: Article, content: "title subtitle authors abstract keywords body"},
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
    comment: CommentMark,
    internal_link: InternalMark
  }
})
