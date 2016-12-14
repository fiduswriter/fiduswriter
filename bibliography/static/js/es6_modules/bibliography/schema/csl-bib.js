import {Literal, SupMark, SubMark, SmallCapsMark} from "./common"
import {Doc, EmMark, StrongMark, Text} from "prosemirror-old/dist/schema-basic"
import {Block, Schema} from "prosemirror-old/dist/model"

class CSLBib extends Block {
    get matchDOMTag() {
        return {"div.csl-bib-body": null}
    }
    toDOM(node) {
        return ["div", {
            class: 'csl-bib-body'
        }, 0]
    }
}

class CSLEntry extends Block {
    get matchDOMTag() {
        return {"div.csl-entry": null}
    }
    toDOM(node) {
        return ["div", {
            class: 'csl-entry'
        }, 0]
    }
}

// This block doesn't actually appear in the HTML output, but because the schema
// system doesn't allow for the mixing of inline and block content, it "imagines"
// that this block exists. This---rather than other blocks---is chosen, because
// it's the first in the list.
class CSLInline extends Block {
    get matchDOMTag() {
        return {"div.csl-inline": null}
    }
    toDOM(node) {
        return ["div", {
            class: 'csl-inline'
        }, 0]
    }
}

class CSLBlock extends Block {
    get matchDOMTag() {
        return {"div.csl-block": null}
    }
    toDOM(node) {
        return ["div", {
            class: 'csl-block'
        }, 0]
    }
}

class CSLLeftMargin extends Block {
    get matchDOMTag() {
        return {"div.csl-left-margin": null}
    }
    toDOM(node) {
        return ["div", {
            class: 'csl-left-margin'
        }, 0]
    }
}

class CSLRightInline extends Block {
    get matchDOMTag() {
        return {"div.csl-right-inline": null}
    }
    toDOM(node) {
        return ["div", {
            class: 'csl-right-inline'
        }, 0]
    }
}

class CSLIndent extends Block {
    get matchDOMTag() {
        return {"div.csl-indent": null}
    }
    toDOM(node) {
        return ["div", {
            class: 'csl-indent'
        }, 0]
    }
}

// A schema to express the citeproc HTML bibliography output
export const cslBibSchema = new Schema({
    nodes: {
        doc: {type: Doc, content: "cslbib"},
        cslbib: {type: CSLBib, content: "cslentry*"},
        cslentry: {type: CSLEntry, content: "block*"},
        cslinline: {type: CSLInline, group: "block", content: "text<_>*"},
        cslblock: {type: CSLBlock, group: "block", content: "text<_>*"},
        cslleftmargin: {type: CSLLeftMargin, group: "block", content: "text<_>*"},
        cslrightinline: {type: CSLRightInline, group: "block", content: "text<_>*"},
        cslindent: {type: CSLIndent, group: "block", content: "text<_>*"},
        text: {type: Text}
    },
    marks: {
        em: EmMark,
        strong: StrongMark,
        smallcaps: SmallCapsMark,
        sup: SupMark,
        sub: SubMark
    }
})
