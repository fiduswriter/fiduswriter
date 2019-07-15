import {Plugin, PluginKey} from "prosemirror-state"

import {SelectionMenuView} from "../menus"

const key = new PluginKey('toolbar')
export const selectionMenuPlugin = function(options) {
    return new Plugin({
        key,
        view(editorView) { return new SelectionMenuView(editorView, options) }
    })
}
