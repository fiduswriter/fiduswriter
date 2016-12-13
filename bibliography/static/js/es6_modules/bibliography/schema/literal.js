import {EnquoteMark, Literal, SupMark, SubMark, SmallCapsMark, UrlMark, Variable} from "./common"
import {Doc, EmMark, LinkMark, StrongMark, Text} from "prosemirror-old/dist/schema-basic"
import {Schema} from "prosemirror-old/dist/model"

export const litSchema = new Schema({
    nodes: {
        doc: {type: Doc, content: "literal"},
        literal: {type: Literal, content: "inline<_>*"},
        text: {type: Text, group: "inline"},
        variable: {type: Variable, group: "inline"}
    },
    marks: {
        em: EmMark,
        enquote: EnquoteMark,
        smallcaps: SmallCapsMark,
        strong: StrongMark,
        sup: SupMark,
        sub: SubMark,
        url: UrlMark
    }
})
