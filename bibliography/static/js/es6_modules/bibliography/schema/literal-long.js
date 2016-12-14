import {EnquoteMark, SupMark, SubMark, SmallCapsMark, UrlMark, Variable} from "./common"
import {Doc, EmMark, StrongMark, Text} from "prosemirror-old/dist/schema-basic"
import {Block, Schema} from "prosemirror-old/dist/model"

class LongLiteral extends Block {
    get matchDOMTag() {
        return {"pre.long-literal": null}
    }
    toDOM(node) {
        return ["pre", {
            class: 'long-literal'
        }, 0]
    }
}

export const longLitSchema = new Schema({
    nodes: {
        doc: {type: Doc, content: "longliteral"},
        longliteral: {type: LongLiteral, content: "inline<_>*"},
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
