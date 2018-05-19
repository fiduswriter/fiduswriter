import {Plugin, PluginKey, TextSelection} from "prosemirror-state"

import {HTMLPaste, TextPaste} from "../paste"

const key = new PluginKey('paste')
export let pastePlugin = function(options) {
    let shiftPressed = false
    return new Plugin({
        key,
        props: {
            handleKeyDown: (view, event) => {
                shiftPressed = event.shiftKey
                return false
            },
            handleDrop: (view, event, slice, dragging) => {
                shiftPressed = event.shiftKey
                if (dragging || (slice && slice.size)) {
                    return false // Something other than en empty plain text string from outside. Handled by PM already.
                }
                let eventPos = view.posAtCoords({left: event.clientX, top: event.clientY})
                if (!eventPos) {
                    return false
                }
                let $mouse = view.state.doc.resolve(eventPos.pos)
                if (!$mouse) {
                    return false
                }
                let tr = view.state.tr
                tr.setSelection(new TextSelection($mouse))
                view.dispatch(tr)
                return true
            },
            transformPastedHTML: inHTML => {
                if (shiftPressed) {
                    return inHTML
                }
                let target = options.editor.currentView === options.editor.view ? 'main' : 'footnotes'
                let ph = new HTMLPaste(inHTML, target)
                return ph.getOutput()
            },
            transformPastedText: inText => {
                if (shiftPressed) {
                    return inText
                }
                let ph = new TextPaste(options.editor, inText, options.editor.currentView)
                ph.init()
                return '' // We need to analyze it asynchronously, so we always need to turn this into an empty string for now.
            }
        }
    })
}
