//
//
//
//import {Plugin, PluginKey, Selection} from "prosemirror-state"
//import {ContentMenu} from '../../common'
//
//const key = new PluginKey('imageMenu')
//
//class ImageView {
//    constructor(node, view, getPos, options) {
//        const imgMenu = document.createElement('div')
//        const menuButton = document.createElement("button")
//        menuButton.classList.add('table-menu-btn')//ch
//        menuButton.innerHTML = '<span class="table-menu-icon"><i class="fa fa-ellipsis-v"></i></span>';//ch
//        imgMenu.appendChild(menuButton)
//        dom.appendChild(imgMenu)
//    }
//
//     stopEvent(_event) {
//        return true
//    }
//
//    ignoreMutation(_record) {
//        return true
//    }
//}
//
//
//export const figureMenuPlugin = function(options) {
//    return new Plugin({
//        key,
//        state: {
//            init(_config, _state) {
//                if (options.editor.docInfo.access_rights === 'write') {
//                    console.log("HELLO")
//                    this.spec.props.nodeViews['image'] =
//                        (node, view, getPos) => new ImageView(node, view, getPos, options)
//                }
//                return {}
//            },
//            apply(tr, prev) {
//                return prev
//            }
//        },
//        props: {
//            nodeViews: {}
//        }
//    })
//}
