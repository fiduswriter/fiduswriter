import {Schema} from "prosemirror-model"
import {EditorState, Plugin, PluginKey, TextSelection} from "prosemirror-state"
import {EditorView, Decoration, DecorationSet} from "prosemirror-view"
import {history, redo, undo} from "prosemirror-history"
import {keymap} from "prosemirror-keymap"
import {tableMenuDialog} from '../dialogs'

const key = new PluginKey('tableMenu')

const doc = {content: 'tableMenu'},
    tableMenu = {
        content: 'inline*',
        parseDOM: [{table: ''}],
        toDOM() {
            return ["div", {
                class: ''
            }, 0]
        }
    },
    text = {group: 'inline'}

const schema = new Schema({
    nodes: {doc, tableMenu, text},
    marks: {}
})


export class TableView {
    constructor(node, view, getPos,options) {
        this.node = node
        this.view = view
        this.getPos = getPos
        this.options = this.options
        this.dom = document.createElement("div")
        var a = document.createElement("button")
        a.className = "testing"
        this.dom.appendChild(a)
        this.dom.lastElementChild.addEventListener('click', event => {
            event.preventDefault()
            const dialog = new tableMenuDialog(node, view, options)
            dialog.init()
            
        })
        this.contentDOM = this.dom.appendChild(document.createElement("table"))
        this.dom.appendChild(this.contentDOM)
    }

    stopEvent(event) {
        return true
    }

    ignoreMutation(record) {
        return true
    }


}

export const tableMenuPlugin = function(options) {
    return new Plugin({
        key,
        state: {
            init(config, state) {
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
