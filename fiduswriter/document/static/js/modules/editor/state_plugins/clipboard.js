import fixUTF8 from "fix-utf8"

import {Plugin, PluginKey, TextSelection} from "prosemirror-state"

import {docClipboardSerializer, fnClipboardSerializer} from "../clipboard/copy"
import {HTMLPaste, TextPaste} from "../clipboard/paste"

const key = new PluginKey("clipboard")

export const getPasteRange = state => {
    const {pasteRange} = key.getState(state)
    return pasteRange
}

export const resetPasteRange = tr => {
    tr.setMeta(key, {pasteRange: null})
}

export const clipboardPlugin = options => {
    let shiftPressed = false
    return new Plugin({
        key,
        state: {
            init() {
                return {
                    pasteRange: null
                }
            },
            apply(tr, _prev, oldState, _state) {
                const meta = tr.getMeta(key)
                if (meta) {
                    // There has been an update, return values from meta instead
                    // of previous values
                    return meta
                }
                const uiEventMeta = tr.getMeta("uiEvent")
                let pasteRange
                if (uiEventMeta && ["paste", "drop"].includes(uiEventMeta)) {
                    // Set pasteRange on paste or drop
                    pasteRange = [
                        oldState.selection.from,
                        oldState.selection.to
                    ]
                } else {
                    pasteRange = this.getState(oldState).pasteRange
                }

                if (pasteRange && tr.docChanged) {
                    const from = tr.mapping.mapResult(pasteRange[0], -1)
                    const to = tr.mapping.mapResult(pasteRange[1], 1)
                    if (from.deleted || to.deleted) {
                        pasteRange = null
                    } else {
                        pasteRange = [from.pos, to.pos]
                    }
                }
                return {
                    pasteRange
                }
            }
        },
        props: {
            handleKeyDown: (_view, event) => {
                shiftPressed = event.shiftKey
                return false
            },
            handleDrop: (view, event, slice, moved) => {
                shiftPressed = event.shiftKey
                if (moved || (slice && slice.size)) {
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
            transformPastedHTML: (inHTML, view) => {
                const {pasteRange} = key.getState(view.state)

                if (pasteRange) {
                    // a previous paste operation has been interrupted by a new one. Cancel.
                    return ""
                }
                if (shiftPressed) {
                    return inHTML
                }
                const ph = new HTMLPaste(
                    options.editor,
                    inHTML,
                    options.viewType,
                    view
                )
                return ph.getOutput()
            },
            transformPastedText: (inText, _plain, view) => {
                const {pasteRange} = key.getState(view.state)

                if (pasteRange) {
                    // a previous paste operation has been interrupted by a new one. Cancel.
                    return ""
                }
                if (shiftPressed) {
                    return inText
                }
                // Chrome on Linux has an encoding problem:
                // it recognizes UTF as Windows 1252. Bug has been filed. This is a temp
                // solution for western European languages.
                // https://bugs.chromium.org/p/chromium/issues/detail?id=760613
                const fixedText = fixUTF8(inText)
                const ph = new TextPaste(
                    options.editor,
                    fixedText,
                    options.editor.currentView
                )
                ph.init()
                return fixedText // We need to analyze it asynchronously, so we always need to turn this into an empty string for now.
            },
            clipboardSerializer:
                options.viewType === "main"
                    ? docClipboardSerializer(options.editor)
                    : fnClipboardSerializer(options.editor)
        }
    })
}
