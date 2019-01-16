import {sup, sub, smallcaps, text} from "./common"
import {marks} from "prosemirror-schema-basic"
import {Schema} from "prosemirror-model"

let doc = {content: "cslbib"}

let cslbib = {
    content: "cslentry*",
    parseDOM: [{tag: 'div.csl-bib-body'}],
    toDOM(_node) {
        return ["div", {
            class: 'csl-bib-body'
        }, 0]
    }
}

let cslentry = {
    content: "block*",
    parseDOM: [{tag: 'div.csl-entry'}],
    toDOM(_node) {
        return ["div", {
            class: 'csl-entry'
        }, 0]
    }
}

// This block doesn't actually appear in the HTML output, but because the schema
// system doesn't allow for the mixing of inline and block content, it "imagines"
// that this block exists. This---rather than other blocks---is chosen, because
// it's the first in the list.
let cslinline = {
    group: "block",
    content: "text*",
    marks: "_",
    parseDOM: [{tag: 'div.csl-inline'}],
    toDOM(_node) {
        return ["div", {
            class: 'csl-inline'
        }, 0]
    }
}

let cslblock = {
    group: "block",
    content: "text*",
    marks: "_",
    parseDOM: [{tag: 'div.csl-block'}],
    toDOM(_node) {
        return ["div", {
            class: 'csl-block'
        }, 0]
    }
}

let cslleftmargin = {
    group: "block",
    content: "text*",
    marks: "_",
    parseDOM: [{tag: 'div.csl-left-margin'}],
    toDOM(_node) {
        return ["div", {
            class: 'csl-left-margin'
        }, 0]
    }
}

let cslrightinline = {
    group: "block",
    content: "text*",
    marks: "_",
    parseDOM: [{tag: 'div.csl-right-inline'}],
    toDOM(_node) {
        return ["div", {
            class: 'csl-right-inline'
        }, 0]
    }
}


let cslindent = {
    group: "block",
    content: "text*",
    marks: "_",
    parseDOM: [{tag: 'div.csl-indent'}],
    toDOM(_node) {
        return ["div", {
            class: 'csl-indent'
        }, 0]
    }
}

// A schema to express the citeproc HTML bibliography output
export const cslBibSchema = new Schema({
    nodes: {
        doc,
        cslbib,
        cslentry,
        cslinline,
        cslblock,
        cslleftmargin,
        cslrightinline,
        cslindent,
        text
    },
    marks: {
        em: marks.em,
        strong: marks.strong,
        smallcaps,
        sup,
        sub
    }
})
