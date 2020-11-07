import {Plugin, PluginKey, NodeSelection} from "prosemirror-state"
import {DOMSerializer} from "prosemirror-model"
import {ContentMenu} from '../../common'
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
        this.dom = document.createElement("div")
        this.dom.classList.add('figure')
        this.serializer = DOMSerializer.fromSchema(node.type.schema)
        this.contentDOM = this.serializer.serializeNode(this.node)
        this.contentDOM.classList.forEach(className => this.dom.classList.add(className))
        this.contentDOM.classList.value = ''
        this.dom.appendChild(this.contentDOM)
        this.menuButton = document.createElement("button")
        this.menuButton.classList.add('figure-menu-btn')
        this.menuButton.innerHTML = '<span class="dot-menu-icon"><i class="fa fa-ellipsis-v"></i></span>'
        this.dom.insertBefore(this.menuButton, this.dom.firstChild)
    }

    stopEvent(event) {
        let stopped = false
        if (event.type === 'mousedown' && event.composedPath().includes(this.menuButton)) {
            stopped = true
            const tr = this.view.state.tr
            const $pos = this.view.state.doc.resolve(this.getPos())
            tr.setSelection(new NodeSelection($pos))
            this.view.dispatch(tr)
            const contentMenu = new ContentMenu({
                menu: this.options.editor.menu.figureMenuModel,
                width: 280,
                page: this.options.editor,
                menuPos: {X: parseInt(event.pageX) + 20, Y: parseInt(event.pageY) - 100},
                onClose: () => {
                    this.view.focus()
                }
            })
            contentMenu.open()
        }
        return stopped
    }


}

class FigureCaptionView {
    constructor(node, view, getPos, options) {
        this.node = node
        this.view = view
        this.getPos = getPos
        this.options = options

        this.dom = document.createElement("figcaption")
        this.dom.innerHTML = '<span class="label"></span><span class="text"></span>'
        this.contentDOM = this.dom.lastElementChild
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
                this.spec.props.nodeViews['figure_caption'] =
                    (node, view, getPos) => new FigureCaptionView(node, view, getPos, options)
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
            view.dom.querySelectorAll('figure').forEach(el => {
                const category = el.dataset.category
                const labelEl = el.querySelector('figcaption span.label')
                if (category === 'none') {
                    labelEl.innerHTML = '&nbsp;'
                    return
                }
                labelEl.innerHTML = CATS[category][userLanguage]
            })
            return {
                update: (view, _prevState) => {
                    let selector = 'figcaption span.label:empty'
                    if (options.editor.view.state.doc.firstChild.attrs.language !== userLanguage) {
                        selector = 'figcaption span.label'
                        userLanguage = options.editor.view.state.doc.firstChild.attrs.language
                    }
                    view.dom.querySelectorAll(selector).forEach(el => {
                        const category = el.parentElement.parentElement.dataset.category
                        if (category === 'none') {
                            return
                        }
                        el.innerHTML = CATS[category][userLanguage]
                    })
                }
            }
        }
    })
}
