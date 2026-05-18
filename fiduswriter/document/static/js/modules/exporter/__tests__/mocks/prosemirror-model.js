// Mock for prosemirror-model
export class Schema {
    constructor(spec) {
        this.spec = spec
    }
}

export class Node {
    constructor(type, attrs, content, marks) {
        this.type = type
        this.attrs = attrs || {}
        this.content = content || []
        this.marks = marks || []
    }

    toJSON() {
        return {
            type: this.type,
            attrs: this.attrs,
            content: this.content
        }
    }

    static fromJSON(_schema, json) {
        return json
    }
}

export class DOMParser {
    static fromSchema(schema) {
        return new DOMParser(schema)
    }

    parse(_dom, _options) {
        return {toJSON: () => ({type: "doc", content: []})}
    }
}

export class DOMSerializer {
    static fromSchema(schema) {
        return new DOMSerializer(schema)
    }

    serializeNode(_node) {
        return document.createElement("div")
    }
}

export const Fragment = {
    fromArray: arr => arr,
    empty: []
}

export const Mark = {
    fromJSON: (_schema, json) => json
}

export class MarkType {
    constructor(name, spec) {
        this.name = name
        this.spec = spec
    }
}
