import {Block, MarkType, Inline, Attribute} from "prosemirror-old/dist/model"

export class Literal extends Block {
    get matchDOMTag() {
        return {"div.literal": null}
    }
    toDOM(node) {
        return ["div", {
            class: 'literal'
        }, 0]
    }
}

export class SupMark extends MarkType {
    get matchDOMTag() {
        return {"sup": null}
    }
    toDOM() {
        return ["sup"]
    }
}

export class SubMark extends MarkType {
    get matchDOMTag() {
        return {"sub": null}
    }
    toDOM() {
        return ["sub"]
    }
}

export class SmallCapsMark extends MarkType {
    get matchDOMTag() {
        return {"span.smallcaps": null}
    }
    get matchDOMStyle() {
        return {"font-variant": value => value == "small-caps" && null}
    }
    toDOM() {
        return ["span",{class:"smallcaps"}]
    }
}

//Currently unsupported

export class UrlMark extends MarkType {
    get matchDOMTag() {
        return {"span.url": null}
    }
    toDOM() {
        return ["span",{class:"url"}]
    }
}

export class EnquoteMark extends MarkType {
    get matchDOMTag() {
        return {"span.enquote": null}
    }
    toDOM() {
        return ["span",{class:"enquote"}]
    }
}

export class Variable extends Inline {
    get attrs() {
        return {
            variable: new Attribute({default: ""}),
        }
    }
    get matchDOMTag() {
        return {"span[data-variable]": dom => ({
            variable: dom.getAttribute("data-variable"),
        })}
    }
    toDOM(node) {
        return ["span", {'data-variable':node.attrs.variable}, node.attrs.variable]
    }
}
