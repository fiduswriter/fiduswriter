import {Plugin, PluginKey} from "prosemirror-state"
import {HeaderView} from "../menus/header-view"

const headerKey = new PluginKey('header')
export let headerPlugin = function(options) {
    return new Plugin({
        key: headerKey,
        view(editorView) { return new HeaderView(editorView, options) }
    })
}
