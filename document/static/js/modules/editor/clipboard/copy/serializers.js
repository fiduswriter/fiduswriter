import {DOMSerializer} from "prosemirror-model"

import {docCopySchema, fnCopySchema} from "./schema"


class ClipboardDOMSerializer extends DOMSerializer {
    serializeFragment(fragment, options) {
        const domFragment = super.serializeFragment(fragment, options)
        return this.postProcessFragment(domFragment)
    }

    postProcessFragment(domFragment) {
        console.log({domFragment})
        return domFragment
    }

    serializeNode(node, options) {
        const domNode = super.serializeNode(node, options)
        return this.postProcessNode(domNode)
    }

    postProcessNode(domNode) {
        console.log({domNode})
        return domNode
    }

    static fromSchema(schema) {
        return schema.cached.domSerializer ||
            (
                schema.cached.domSerializer = new ClipboardDOMSerializer(
                    this.nodesFromSchema(schema),
                    this.marksFromSchema(schema)
                )
            )
    }
}

export const docClipboardSerializer = ClipboardDOMSerializer.fromSchema(docCopySchema)
export const fnClipboardSerializer = ClipboardDOMSerializer.fromSchema(fnCopySchema)
