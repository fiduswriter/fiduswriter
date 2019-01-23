import {Plugin, PluginKey, TextSelection} from "prosemirror-state"
import {TableMenuDialog} from '../dialogs'

const key = new PluginKey('tableMenu')

export class TableView {
    constructor(node, view, getPos, options) {
        this.node = node
        this.view = view
        this.getPos = getPos
        this.options = this.options
        this.dom = document.createElement("div")
        this.dom.classList.add(`table-${node.attrs.width}`,`table-${node.attrs.aligned}`,'table-container');
        const menuButton = document.createElement("button")
        menuButton.classList.add('table-menu-btn')
        menuButton.innerHTML = '<span class="table-menu-icon"><i class="fa fa-ellipsis-v"></i></span>'
        this.dom.appendChild(menuButton)
        menuButton.addEventListener('click', event => {
            event.preventDefault();
            event.stopImmediatePropagation()
            if(isSelectedTableClicked(this.view.state,getPos())){
                const dialog = new TableMenuDialog(node, view, options)
                dialog.init()
            }else{
                let tr = view.state.tr;
                let $pos = view.state.doc.resolve(getPos()+2)
                tr.setSelection(new TextSelection($pos,$pos))
                view.dispatch(tr)
                const dialog = new TableMenuDialog(node, view, options)
                dialog.init();
            }
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

}

const isSelectedTableClicked = (state, $pos) => {
    let pathArr = state.selection.$anchor.path;
    for(let i = 0; i < pathArr.length ; i++){
        if(pathArr[i].type && pathArr[i].type.name && pathArr[i].type.name === "table" && pathArr[i-1] === $pos){
            return true;
        }
    }
    return false;
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
