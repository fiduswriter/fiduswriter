import {tableMenuTemplate} from "./templates"
import {ContentMenu} from "../../common"

export class TableMenuDialog {
    constructor(node, view, options) {
        this.node = node
        this.view = view
        this.options = options
        this.contentMenu = false
        this.listeners ={}
    }

    init() {
        this.listeners.onclick = event => this.onclick(event)
        document.body.addEventListener('click', this.listeners.onclick)
        this.contentMenu = new ContentMenu({
            body: tableMenuTemplate(this.options),
            width: 290,
            onClose: () => {this.view.focus(); this.destroy();}
        })
        this.contentMenu.open()
    }

    destroy() {
        document.body.removeEventListener('click', this.listeners.onclick)
    }

    onclick(event){
        event.preventDefault()
        event.stopImmediatePropagation()
        const target = event.target
        if(target.matches('li.table-menu-item')) {
            let menuNumber = target.dataset.index;
            const menuItem = this.options.editor.menu.tableMenuModel.content[menuNumber];
            if (menuItem.disabled && menuItem.disabled(this.options.editor)){
                return
            }
            menuItem.action(this.options.editor)
            this.contentMenu.close()
            this.destroy()
        }
    }
}
