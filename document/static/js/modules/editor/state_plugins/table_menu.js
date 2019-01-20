import {Plugin, PluginKey} from "prosemirror-state"
import {TableMenuDialog} from '../dialogs'

const key = new PluginKey('tableMenu')

export class TableView {
    constructor(node, view, getPos, options) {
        this.node = node
        this.view = view
        this.getPos = getPos
        this.options = this.options
        this.dom = document.createElement("div")
        this.dom.classList.add(`table-${node.attrs.width}`,`table-${node.attrs.aligned}`,'container');
        const menu_btn = document.createElement("button")
        menu_btn.className = "menu-btn"
        menu_btn.classList.add('btn-disabled')
        const div = document.createElement("div")
        div.className = 'menu-stripe'
        menu_btn.append(div)
        this.dom.appendChild(menu_btn)
        this.dom.lastElementChild.addEventListener('click', event => {
            event.preventDefault()
            const dialog = new TableMenuDialog(node, view, options)
            dialog.init()
        })
        const table = document.createElement("table")
        const tbody = document.createElement("tbody")
        table.append(tbody)
        this.contentDOM = this.dom.appendChild(table)
        this.contentDOM.classList.add(`layout-${node.attrs.layout}`)
        this.dom.appendChild(this.contentDOM)
    }

    stopEvent(_event) {
        return true
    }

    ignoreMutation(_record) {
        return true
    }

    update(node){
        const table = findTable(this.view.state)
        if(table && node === table){
            this.dom.querySelector('.menu-btn').classList.remove('btn-disabled')
        }else{
            this.dom.querySelector('.menu-btn').classList.add('btn-disabled')
        }
        return true
    }

}

const findTable = function(state) {
    const $head = state.selection.$head
    for (let d = $head.depth; d > 0; d--) if ($head.node(d).type.spec.tableRole == "table") return $head.node(d)
    return false
}

export const tableMenuPlugin = function(options) {
    return new Plugin({
        key,
        state: {
            init(_config, _state) {
                if (options.editor.docInfo.access_rights === 'write') {
                    this.spec.props.nodeViews['table'] =
                        (node, view, getPos) => new TableView(node, view, getPos,options)
                }
                return {}
            },
            apply(tr, prev) {
                return prev
            }
        },
        props: {
            nodeViews: {}
        }
    })
}
