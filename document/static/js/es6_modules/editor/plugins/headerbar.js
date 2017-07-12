import {Plugin, PluginKey} from "prosemirror-state"
import {HeaderbarView} from "../menus"

const headerbarKey = new PluginKey('header')
export let headerbarPlugin = function(options) {
    return new Plugin({
        key: headerbarKey,
        view(editorView) { return new HeaderbarView(editorView, options) }
    })
}
