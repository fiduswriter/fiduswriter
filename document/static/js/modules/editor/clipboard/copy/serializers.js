import {DOMSerializer} from "prosemirror-model"
import {RenderCitations} from "../../../citations/render"
import {docCopySchema, fnCopySchema} from "./schema"


// Wrap around DOMSerializer, allowing post processing.
class ClipboardDOMSerializer {
    constructor(nodes, marks, editor) {
        this.domSerializer = new DOMSerializer(nodes, marks)
        this.editor = editor
    }

    serializeFragment(fragment, options) {
        const domFragment = this.domSerializer.serializeFragment(fragment, options)
        return this.postProcessFragment(domFragment)
    }

    postProcessFragment(domFragment) {
        this.renderCitations(domFragment)
        this.removeTrackingData(domFragment)
        return domFragment
    }

    renderCitations(domFragment) {
        this.citRenderer = new RenderCitations(
            domFragment,
            this.editor.view.state.doc.firstChild.attrs.citationstyle,
            this.editor.mod.db.bibDB,
            this.editor.mod.styles.citationStyles,
            this.editor.mod.styles.citationLocales
        )
        this.citRenderer.init()
        this.citRenderer.renderCitations()
        if (this.citRenderer.fm.bibHTML.length) {
            let bibDiv = document.createElement('div')
            bibDiv.classList.add('fiduswriter-clipboard-bibliography')
            bibDiv.innerHTML = this.citRenderer.fm.bibHTML
            bibDiv.firstElementChild.innerHTML = gettext('Bibliography')
            domFragment.appendChild(bibDiv)
        }
    }

    removeTrackingData(domFragment) {
        domFragment.querySelectorAll('.approved-insertion, .insertion').forEach(el => el.outerHTML = el.innerHTML)
        domFragment.querySelectorAll('.deletion').forEach(el => el.parentElement.remoChild(el))
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
