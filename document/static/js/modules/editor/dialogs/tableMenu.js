import {tableMenuTemplate} from "./templates"
import {Dialog} from "../../common"
import {tableMenuModel} from "../menus"

export class TableMenuDialog {
    constructor(node, view, options) {
        this.node = node
        this.view = view
        this.options = options
        this.dialog = false
        this.listeners ={}
    }

    init() {
        this.listeners.onclick = event => this.onclick(event)
        document.body.addEventListener('click', this.listeners.onclick)
        this.dialog = new Dialog({
            body: tableMenuTemplate(this.options),
            width: 260,
            height: 460,
            onClose: () => {this.view.focus(); this.destroy();}
        })
        this.dialog.open()
    }

    destroy() {
        document.body.removeEventListener('click', this.listeners.onclick)
    }

    onclick(event){
        event.preventDefault()
        event.stopImmediatePropagation()
        const target = event.target
        if(target.matches('li.menu-item')) {
            let menuNumber = target.dataset.index;
            const menuItem = tableMenuModel().content[menuNumber];
            if (menuItem.disabled && menuItem.disabled(this.options.editor)){
                return
            }
            menuItem.action(this.options.editor)
            this.dialog.close()
            this.destroy()
        }
    }
}


