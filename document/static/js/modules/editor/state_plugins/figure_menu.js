import {Plugin, PluginKey} from "prosemirror-state"
import {DOMSerializer} from "prosemirror-model"
import {FigureDialog} from "../dialogs"
import {
    FIG_CATS, FIGURE, TABLE, PHOTO
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


export const figureMenuPlugin = function(options) {
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
        view(_view) {
            let user_language = options.editor.view.state.doc.firstChild.attrs.language
             Array.from(document.querySelectorAll('*[class^="figure-cat-"] ')).forEach(el => el.innerHTML = FIG_CATS[el.dataset.figureCategory][user_language])
             return {
                update: (view, _prevState) => {
                    let user_language = options.editor.view.state.doc.firstChild.attrs.language
                    Array.from(document.querySelectorAll('*[class^="figure-cat-"] ')).forEach(el => el.innerHTML = FIG_CATS[el.dataset.figureCategory][user_language])

                }
            }

        }
    })
}
