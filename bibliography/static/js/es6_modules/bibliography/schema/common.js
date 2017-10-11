export let text = {
    group: "inline"
}

export let literal = {
    content: "inline*",
    marks: "_",
    parseDOM: [{tag: 'div.literal'}],
    toDOM() {
        return ["div", {
            class: 'literal'
        }, 0]
    }
}

export let variable = {
    inline: true,
    group: "inline",
    attrs: {
        variable: {default:""}
    },
    parseDOM: [{
        tag: 'span[data-variable]',
        getAttrs(dom) {
            return {
                variable: dom.getAttribute("data-variable"),
            }
        }
    }],
    toDOM(node) {
        return ["span", {'data-variable':node.attrs.variable}, node.attrs.variable]
    }
}

export let sup = {
    parseDOM: [
        {tag: 'sup'},
        {style: "vertical-align", getAttrs: value => value == "super" && null}
    ],
    toDOM() {
        return ["sup"]
    }
}

export let sub = {
    parseDOM: [
        {tag: 'sub'},
        {style: "vertical-align", getAttrs: value => value == "sub" && null}
    ],
    toDOM() {
        return ["sub"]
    }
}

export let smallcaps = {
    parseDOM: [
        {tag: 'span.smallcaps'},
        {style: "font-variant", getAttrs: value => value == "small-caps" && null}
    ],
    toDOM() {
        return ["span", {class:"smallcaps"}]
    }
}

//Currently unsupported

export let url = {
    parseDOM: [{tag: 'span.url'}],
    toDOM() {
        return ["span",{class:"url"}]
    }
}

export let enquote = {
    parseDOM: [{tag: 'span.enquote'}],
    toDOM() {
        return ["span", {class:"enquote"}]
    }
}
