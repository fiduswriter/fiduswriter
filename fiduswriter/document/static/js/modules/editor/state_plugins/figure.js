import {Plugin, PluginKey} from "prosemirror-state"
import {DOMSerializer} from "prosemirror-model"
import {FigureDialog} from "../dialogs"
import {
    CATS
} from "../../schema/i18n"

const key = new PluginKey('figureMenu')

class FigureView {
    constructor(node, view, getPos, options) {

        this.node = node
        this.view = view
        this.getPos = getPos
        this.options = options

        this.serializer = DOMSerializer.fromSchema(node.type.schema)

        this.dom = this.serializer.serializeNode(this.node)
        this.menuButton = document.createElement("button")
        this.menuButton.classList.add('figure-menu-btn')
        this.menuButton.innerHTML = '<span class="dot-menu-icon"><i class="fa fa-ellipsis-v"></i></span>'
        this.dom.insertBefore(this.menuButton, this.dom.firstChild)
        this.menuButton.addEventListener('click', () => {
            const editor = this.options.editor
            const dialog = new FigureDialog(editor)
            dialog.init()
        })
    }
}


export const figurePlugin = function(options) {
    return new Plugin({
        key,
        state: {
            init(_config, _state) {
                if (options.editor.docInfo.access_rights === 'write') {
                    this.spec.props.nodeViews['figure'] =
                        (node, view, getPos) => new FigureView(node, view, getPos, options)
                }
                return {}
            },
            apply(tr, prev) {
                return prev
            }
        },
        props: {
            nodeViews: {}
        },
        view(view) {
            let userLanguage = options.editor.view.state.doc.firstChild.attrs.language
            view.dom.querySelectorAll('*[class^="cat-"]').forEach(el => el.innerHTML = CATS[el.dataset.category][userLanguage])
            view.dom.querySelectorAll('table').forEach(el => {
                const category = el.dataset.category
                const labelEl = el.querySelector('caption span.label')
                if (category === 'none') {
                    labelEl.innerHTML = '&nbsp;'
                    return
                }
                labelEl.innerHTML = CATS[category][userLanguage]
            })
            return {
                update: (view, _prevState) => {
                    let selector = '*[class^="cat-"]:empty'
                    if (options.editor.view.state.doc.firstChild.attrs.language !== userLanguage) {
                        selector = '*[class^="cat-"]'
                        userLanguage = options.editor.view.state.doc.firstChild.attrs.language
                    }
                    view.dom.querySelectorAll(selector).forEach(el => el.innerHTML = CATS[el.dataset.category][userLanguage])
                }
            }
        }
    })
}
