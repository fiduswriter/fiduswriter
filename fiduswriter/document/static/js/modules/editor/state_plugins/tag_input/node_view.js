import {GapCursor} from "prosemirror-gapcursor"
import {TextSelection} from "prosemirror-state"
import {addDeletedPartWidget} from "../document_template"

import {findValidCaretPosition} from "./helpers"
import {createTagEditor} from "./tag_editor"

export class TagsPartView {
    constructor(node, view, getPos) {
        this.node = node
        this.view = view
        this.getPos = getPos
        this.dom = document.createElement("div")
        this.dom.classList.add("doc-part")
        this.dom.classList.add(`doc-${this.node.type.name}`)
        this.dom.classList.add(`doc-${this.node.attrs.id}`)
        if (node.attrs.hidden) {
            this.dom.dataset.hidden = true
        }

        this.contentDOM = document.createElement("span")
        this.contentDOM.classList.add("tags-inner")
        this.dom.appendChild(this.contentDOM)
        if (node.attrs.locking !== "fixed") {
            const [tagInputDOM, tagInputView] = createTagEditor(
                view,
                getPos,
                () => this.getNode()
            )
            this.tagInputView = tagInputView
            this.dom.appendChild(tagInputDOM)
        }

        if (node.attrs.deleted) {
            addDeletedPartWidget(this.dom, view, getPos)
        }
    }

    stopEvent(event) {
        // Trap events for tagInputView
        if (["click", "mousedown"].includes(event.type)) {
            return false
        } else if (!this.tagInputView || this.node.attrs.locking === "fixed") {
            return false
        } else if (event.type === "keydown" && this.tagInputView.hasFocus()) {
            return true
        } else {
            return false
        }
    }

    ignoreMutation(_record) {
        return true
    }

    update(node, _decorations, _innerDecorations) {
        this.node = node
        return true
    }

    getNode() {
        return this.node
    }
}
