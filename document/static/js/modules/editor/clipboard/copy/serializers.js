import {DOMSerializer} from "prosemirror-model"

import {docCopySchema, fnCopySchema} from "./schema"


// Wrap around DOMSerializer, allowing post processing.
class ClipboardDOMSerializer {
    constructor(nodes, marks, editor) {
        this.domSerializer = new DOMSerializer(nodes, marks)
        this.editor = editor
    }

    getSetting(setting) {
        return this.editor.view.state.doc.firstChild.attrs[setting]
    }

    serializeFragment(fragment, options) {
        const domFragment = this.domSerializer.serializeFragment(fragment, options)
        return this.postProcessFragment(domFragment)
    }

    postProcessFragment(domFragment) {
        console.log({domFragment})

        return domFragment
    }


    static fromSchema(schema, editor) {
        return new ClipboardDOMSerializer(
            DOMSerializer.nodesFromSchema(schema),
            DOMSerializer.marksFromSchema(schema),
            editor
        )
    }
}

export const docClipboardSerializer = editor => ClipboardDOMSerializer.fromSchema(docCopySchema, editor)
export const fnClipboardSerializer = editor => ClipboardDOMSerializer.fromSchema(fnCopySchema, editor)
