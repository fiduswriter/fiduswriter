


import {Plugin, PluginKey, Selection} from "prosemirror-state"
import {ContentMenu} from '../../common'
import {FigureDialog} from "../dialogs"

const key = new PluginKey('imageMenu')
let imageDBBroken = false
const FIG_CATS = {
    'none': gettext('None'),
    'figure': gettext('Figure'),
    'table': gettext('Table'),
    'photo': gettext('Photo')
}
class ImageView {
    constructor(node, view, getPos, options) {

        this.node = node
        this.view = view
        this.getPos = getPos
        this.options = options

        this.dom = document.createElement('figure')
        this.dom.dataset.equation = this.node.attrs.equation
        this.dom.dataset.image = this.node.attrs.image
        this.dom.dataset.figureCategory = this.node.attrs.figureCategory
        this.dom.dataset.caption = this.node.attrs.caption
        this.dom.id = this.node.attrs.id
        this.dom.dataset.aligned = this.node.attrs.aligned
        this.dom.dataset.width = this.node.attrs.width

        switch (this.node.attrs.aligned) {
            case 'right':
                this.dom.classList.add('aligned-right')
                break
            case 'left':
                this.dom.classList.add('aligned-left')
                break
            case 'center':
                this.dom.classList.add('aligned-center')
                break
            default:
                this.dom.classList.add('aligned-center')
        }

        switch (this.node.attrs.width) {
            case '100':
                this.dom.classList.add('image-width-100')
                break
            case '75':
                this.dom.classList.add('image-width-75')
                break
            case '50':
                this.dom.classList.add('image-width-50')
                break
            default:
                this.dom.classList.add('image-width-25')
        }

        if (this.node.attrs.image !== false) {
            this.dom.appendChild(document.createElement("div"))
            if (this.node.type.schema.cached.imageDB) {
                if (this.node.type.schema.cached.imageDB.db[this.node.attrs.image] &&
                    this.node.type.schema.cached.imageDB.db[node.attrs.image].image) {
                    const imgSrc = this.node.type.schema.cached.imageDB.db[node.attrs.image].image
                    const img = document.createElement("img")
                    img.setAttribute('src', imgSrc)
                    this.dom.firstChild.appendChild(img)
                    this.dom.dataset.imageSrc = node.type.schema.cached.imageDB.db[node.attrs.image].image


                     this.menuButton = document.createElement("button")
                     this.menuButton.classList.add('figure-menu-btn')
                     this.menuButton.innerHTML = '<span class="figure-menu-icon"><i class="fa fa-ellipsis-v"></i></span>';
                     //menuButton.onclick = openFigureDialog()
                     this.menuButton.addEventListener('click', () => {
                        const editor = this.options.editor
                        const dialog = new FigureDialog(editor)
                        dialog.init()
                        console.log("clicked dialog opened")
                        console.log("editor :- ", editor)
                     })
                     this.dom.appendChild(this.menuButton)
                } else {
                    /* The image was not present in the imageDB -- possibly because a collaborator just added ut.
                    Try to reload the imageDB, but only once. If the image cannot be found in the updated
                    imageDB, do not attempt at reloading the imageDB if an image cannot be
                    found. */
                    if (!imageDBBroken) {
                        this.node.type.schema.cached.imageDB.getDB().then(() => {
                            if (this.node.type.schema.cached.imageDB.db[node.attrs.image] &&
                                this.node.type.schema.cached.imageDB.db[node.attrs.image].image) {
                                const imgSrc = node.type.schema.cached.imageDB.db[node.attrs.image].image
                                const img = document.createElement("img")
                                img.setAttribute('src', imgSrc)
                                this.dom.firstChild.appendChild(img)
                                this.dom.dataset.imageSrc = this.node.type.schema.cached.imageDB.db[this.node.attrs.image].image


                                this.menuButton = document.createElement("button")
                                this.menuButton.classList.add('figure-menu-btn')
                                this.menuButton.innerHTML = '<span class="figure-menu-icon"><i class="fa fa-ellipsis-v"></i></span>';
                                this.menuButton.addEventListener('click', () => {
                                    const editor = this.options.editor
                                    const dialog = new FigureDialog(editor)
                                    dialog.init()
                                    console.log("clicked dialog opened")
                                    console.log("editor :- ", editor)
                                })
                                this.dom.appendChild(this.menuButton)
                            } else {
                                imageDBBroken = true
                            }
                        })
                    }
                }
            }

        } else {
            this.domEquation = document.createElement('div')
            this.domEquation.classList.add('figure-equation')
            this.domEquation.setAttribute('data-equation', this.node.attrs.equation)
            import("mathlive").then(MathLive => {
                this.domEquation.innerHTML = MathLive.latexToMarkup(this.node.attrs.equation, 'displaystyle')
            })
            this.dom.appendChild(this.domEquation)
        }
        this.captionNode = document.createElement("figcaption")
        if (this.node.attrs.figureCategory !== 'none') {
            this.figureCatNode = document.createElement('span')
            this.figureCatNode.classList.add(`figure-cat-${this.node.attrs.figureCategory}`)
            this.figureCatNode.setAttribute('data-figure-category', this.node.attrs.figureCategory)
            this.figureCatNode.innerHTML = FIG_CATS[this.node.attrs.figureCategory]
            this.captionNode.appendChild(this.figureCatNode)
        }
        if (this.node.attrs.caption !== '') {
            this.captionTextNode = document.createElement("span")
            this.captionTextNode.setAttribute('data-caption', this.node.attrs.caption)
            this.captionTextNode.innerHTML = this.node.attrs.caption

            this.captionNode.appendChild(this.captionTextNode)
        }
        // Add table captions above the table, other captions below.
        if (this.node.attrs.figureCategory === 'table') {
            this.dom.insertBefore(this.captionNode, this.dom.lastChild)
        } else {
            this.dom.appendChild(this.captionNode)
        }





//        this.dom = document.createElement('div')
//        this.menuButton = document.createElement("button")
//        this.menuButton.classList.add('figure-menu-btn')
//        this.menuButton.innerHTML = '<span class="figure-menu-icon"><i class="fa fa-ellipsis-v"></i></span>';
//        this.menuButton.addEventListener('click', () => {
//            const editor = options.editor
//            const dialog = new FigureDialog(options.editor)
//            dialog.init()
//            console.log("clicked dialog opened")
//        })
//        this.dom.appendChild(this.menuButton)
//        const fig = document.createElement("figure")
//        this.contentDOM = this.dom.appendChild(fig)
//        this.dom.appendChild(this.contentDOM)
//        if (this.node.type.schema.cached.imageDB.db[node.attrs.image] &&
//            this.node.type.schema.cached.imageDB.db[node.attrs.image].image) {
//                const imgSrc = this.node.type.schema.cached.imageDB.db[node.attrs.image].image
//                const img = document.createElement("img")
//                img.setAttribute('src', imgSrc)
//                this.dom.firstChild.appendChild(img)
//                this.dom.dataset.imageSrc = node.type.schema.cached.imageDB.db[node.attrs.image].image


//                                const menuButton = document.createElement("button")
//                                menuButton.classList.add('figure-menu-btn')
//                                menuButton.innerHTML = '<span class="figure-menu-icon"><i class="fa fa-ellipsis-v"></i></span>';
//                                dom.appendChild(menuButton)

    }


/*
     stopEvent(event, options) {
        console.log("stopEvent")

//        const dialog = new FigureDialog(this.options.editor)
//        dialog.init()

        return true
    }*/

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
