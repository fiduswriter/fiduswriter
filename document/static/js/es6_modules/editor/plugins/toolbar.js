import {Plugin, PluginKey} from "prosemirror-state"
import {ToolbarView} from "../menus"

const toolbarKey = new PluginKey('toolbar')
export let toolbarPlugin = function(options) {
    return new Plugin({
        key: toolbarKey,
        view(editorView) { return new ToolbarView(editorView, options) }
    })
}
