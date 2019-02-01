import {Plugin, PluginKey} from "prosemirror-state"
import {NavigatorView} from "../navigator"
import {escapeText, findTarget} from "../../common"

const key = new PluginKey('navigator')

function tocHTML(tocItems) {
    return `
    ${
        tocItems.map(
            item => {
                const level = item.type.name.substr(-1)
                return `<h${level}><a href="#${item.id}">${escapeText(item.textContent)}</a></h${level}>`
            }
        ).join('')
    }`
}

export const navigatorPlugin = function(options) {
    return new Plugin({
        key,
        state: {
            init (config, state){    
            },

            apply(tr, prev, oldState, state) {
                let tocItems =  state.tocRender$.decos.children[2].local[0].type.spec.tocItems || []
                document.getElementById('navigator-list').innerHTML = tocHTML(tocItems)
            }
        },
        view(editorView) {
            let tocItems =  editorView.state.tocRender$.decos.children[2].local[0].type.spec.tocItems || []
            let tocHTML1 = tocHTML(tocItems)
            return new NavigatorView(editorView, options, tocHTML1) }
    })
}
