import {Plugin, PluginKey} from "prosemirror-state"
import {NavigatorView} from "../navigator"
import {escapeText} from "../../common"
const key = new PluginKey('navigator')

export function navigatorHTML(items) {
    return `
    ${
        items.map(
            item => {
                const level = item.type.name.substr(-1)
                return `<h${level}><a href="#${item.id}">${escapeText(item.textContent)}</a></h${level}>`
            }
        ).join('')
    }`
}

export function getNavigatorItems(state){
    let items = []
    state.doc.descendants((node) => {
        if (node.attrs && node.attrs.hidden) {
            return false
        } else if (node.type.groups.includes('heading')) {
            items.push({id: node.attrs.id, textContent: node.textContent, type: node.type})
        }
    })
    if(items.length)
        return navigatorHTML(items)
    else
        return false
}

export const navigatorPlugin = function(options) {
    return new Plugin({
        key,
        state: {
            init (config, state){
            },
            apply(tr, prev, oldState, state) {
                let navigatorItems =  getNavigatorItems(state) || []
                if(navigatorItems.length){
                    document.querySelector('#navigator-list').innerHTML = navigatorItems
                    document.querySelector('#navigator').classList.remove('hide-navigator')
                }else{
                    document.querySelector('#navigator').classList.add('hide-navigator')
                }
            }
        },
        view(editorView) {
            let navigatorItems =  getNavigatorItems(editorView.state) || []
            return new NavigatorView(editorView, options, navigatorItems) }
    })
}
