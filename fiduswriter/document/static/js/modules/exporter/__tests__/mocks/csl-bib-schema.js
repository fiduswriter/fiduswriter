// Mock for bibliography/schema/csl_bib
import {Schema} from "prosemirror-model"

const cslbib = {
    content: "cslentry*",
    parseDOM: [{tag: "div.csl-bib-body"}],
    toDOM() {
        return ["div", {class: "csl-bib-body"}, 0]
    }
}

const cslentry = {
    content: "inline*",
    parseDOM: [{tag: "div.csl-entry"}],
    toDOM() {
        return ["div", {class: "csl-entry"}, 0]
    }
}

export const cslBibSchema = new Schema({
    nodes: {
        doc: {content: "cslbib"},
        cslbib,
        cslentry,
        text: {group: "inline"},
        cslblock: {inline: true, group: "inline"},
        cslinline: {inline: true, group: "inline"},
        cslindent: {inline: true, group: "inline"},
        cslleftmargin: {inline: true, group: "inline"},
        cslrightinline: {inline: true, group: "inline"},
        bibliography_heading: {inline: true, group: "inline"},
        hard_break: {inline: true, group: "inline"}
    },
    marks: {
        em: {},
        strong: {},
        smallcaps: {},
        sup: {},
        sub: {}
    }
})

export default {cslBibSchema}
