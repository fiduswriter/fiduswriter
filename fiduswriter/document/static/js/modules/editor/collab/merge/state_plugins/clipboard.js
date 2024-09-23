import {Plugin, PluginKey, TextSelection} from "prosemirror-state"
import {docClipboardSerializer} from "../../../clipboard/copy"
import {HTMLPaste} from "../../../clipboard/paste"

const key = new PluginKey("clipboard")
export const clipboardPlugin = options => {
    let shiftPressed = false
    return new Plugin({
        key,
        props: {
            handleKeyDown: (_view, event) => {
                shiftPressed = event.shiftKey
                return false
            },
            handleDrop: (view, event, slice, dragging) => {
                shiftPressed = event.shiftKey
                if (dragging || (slice && slice.size)) {
                    return false // Something other than en empty plain text string from outside. Handled by PM already.
                }
                const eventPos = view.posAtCoords({
                    left: event.clientX,
                    top: event.clientY
                })
                if (!eventPos) {
                    return false
                }
                const $mouse = view.state.doc.resolve(eventPos.pos)
                if (!$mouse) {
                    return false
                }
                const tr = view.state.tr
                tr.setSelection(new TextSelection($mouse))
                view.dispatch(tr)
                return true
            },
            transformPastedHTML: (inHTML, _view) => {
                if (shiftPressed) {
                    return inHTML
                }
                const ph = new HTMLPaste(options.editor, inHTML, "main")
                return ph.getOutput()
            },
            clipboardSerializer: docClipboardSerializer(options.editor)
        }
    })
}
