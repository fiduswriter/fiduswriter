


import {Plugin, PluginKey, Selection} from "prosemirror-state"
import {ContentMenu} from '../../common'
import {FigureDialog} from "../dialogs"

const key = new PluginKey('imageMenu')

class ImageView {
    constructor(node, view, getPos, options) {

        this.node = node
        this.view = view
        this.getPos = getPos
        this.options = options

        this.imgMenu = document.createElement('div')
        this.menuButton = document.createElement("button")
        this.menuButton.classList.add('figure-menu-btn')
        this.menuButton.innerHTML = '<span class="figure-menu-icon"><i class="fa fa-ellipsis-v"></i></span>';
//        this.menuButton.addEventListener('click', () => {
//            const editor = options.editor
//            const dialog = new FigureDialog(options.editor)
//            dialog.init()
//            console.log("clicked dialog opened")
//        })
        this.imgMenu.appendChild(this.menuButton)
        const fig = document.createElement("figure")
        this.contentDOM = this.imgMenu.appendChild(fig)
        this.imgMenu.appendChild(this.contentDOM)


    }



     stopEvent(event, options) {
        console.log("stopEvent")

        const dialog = new FigureDialog(this.options.editor)
        dialog.init()

        return true
    }

    ignoreMutation(_record) {
        console.log("igM")
        return true
    }


}


export const figureMenuPlugin = function(options) {
    return new Plugin({
        key,
        state: {
            init(_config, _state) {
                if (options.editor.docInfo.access_rights === 'write') {
                    console.log("HELLO")
                    console.log("spec :- ", this.spec)
                    this.spec.props.nodeViews['figure'] =
                        (node, view, getPos) => new ImageView(node, view, getPos, options)
                     console.log("node view created")
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
