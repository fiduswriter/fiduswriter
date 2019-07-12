import {Plugin, PluginKey, Selection} from "prosemirror-state"
import {ContentMenu} from '../../common'

const key = new PluginKey('tableMenu')

class TableView {
    constructor(node, view, getPos, options) {
        this.node = node
        this.view = view
        this.getPos = getPos
        this.options = options
        this.dom = document.createElement("div")
        this.dom.classList.add(`table-${node.attrs.width}`, `table-${node.attrs.aligned}`, 'table-container')
        this.menuButton = document.createElement("button")
        this.menuButton.classList.add('table-menu-btn')
        this.menuButton.innerHTML = '<span class="table-menu-icon"><i class="fa fa-ellipsis-v"></i></span>'
        this.dom.appendChild(this.menuButton)
        const table = document.createElement("table")
        const tbody = document.createElement("tbody")
        table.append(tbody)
        this.contentDOM = this.dom.appendChild(table)
        this.contentDOM.classList.add(`table-${node.attrs.layout}`)
        this.dom.appendChild(this.contentDOM)
    }

    stopEvent(event) {
        let stopped = false
        if (event.type === 'mousedown' && event.composedPath().includes(this.menuButton)) {
            stopped = true
            if (!isSelectedTableClicked(this.view.state, this.getPos())) {
                const tr = this.view.state.tr
                const $pos = this.view.state.doc.resolve(this.getPos())
                tr.setSelection(Selection.findFrom($pos, 1, true))
                this.view.dispatch(tr)
            }
            const contentMenu = new ContentMenu({
                menu: this.options.editor.menu.tableMenuModel,
                width: 280,
                page: this.options.editor,
                menuPos: {X: parseInt(event.pageX)+20, Y: parseInt(event.pageY)-100},
                onClose: () => {
                    this.view.focus()
                }
            })
            contentMenu.open()
        }
        return stopped
    }

}

const isSelectedTableClicked = (state, $pos) => {
    const pathArr = state.selection.$anchor.path
    for (let i = 0; i < pathArr.length ; i++) {
        if (pathArr[i].type && pathArr[i].type.name && pathArr[i].type.name === "table" && pathArr[i-1] === $pos) {
            return true
        }
    }
    return false
}

export const tableMenuPlugin = function(options) {
    return new Plugin({
        key,
        state: {
            init(_config, _state) {
                if (options.editor.docInfo.access_rights === 'write') {
                    this.spec.props.nodeViews['table'] =
                        (node, view, getPos) => new TableView(node, view, getPos, options)
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
