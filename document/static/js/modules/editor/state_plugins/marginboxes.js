import {Plugin, PluginKey} from "prosemirror-state"

const key = new PluginKey('marginboxes')
export let marginboxesPlugin = function(options) {
    return new Plugin({
        key,
        view(editorState) {
            return {
                update: (view, prevState) => {
                    options.editor.mod.marginboxes.view(view)
                }
            }
        }
    })
}
