import {Plugin, PluginKey} from "prosemirror-state"

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
            handleDrop: (view, event) => {
                shiftPressed = event.shiftKey
                return false
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
                let target = options.editor.currentView === options.editor.view ? 'main' : 'footnotes'
                let ph = new TextPaste(options.editor, inText, target)
                return ph.getOutput()
            }
        }
    })
}
