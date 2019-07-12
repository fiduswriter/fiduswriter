


import {Plugin, PluginKey, Selection} from "prosemirror-state"
import {ContentMenu} from '../../common'

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
        this.imgMenu.appendChild(this.menuButton)
    }

     stopEvent(_event) {
        return true
    }

    ignoreMutation(_record) {
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
//                     console.log("node :- ", node)
//                     console.log("view :- ", view)
//                     console.log("getPos :- ", getPos)
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
