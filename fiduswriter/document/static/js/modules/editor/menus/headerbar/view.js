import {DiffDOM} from "diff-dom"
import {keyName} from "w3c-keyname"
import {escapeText, addAlert} from "../../../common"

export class HeaderbarView {
    constructor(editorView, options) {
        this.editorView = editorView
        this.options = options

        this.editor = this.options.editor
        this.editor.menu.headerView = this

        this.dd = new DiffDOM({
            valueDiffing: false
        })
        this.headerEl = document.querySelector('#headerbar').firstElementChild
        this.listeners = {}

        this.removeUnavailable(this.options.editor.menu.headerbarModel)

        this.bindEvents()
        this.update()
        this.parentChain = []
    }

    removeUnavailable(menu) {
        // Remove those menu items from the menu model that are not available for this document.
        // Used for example for language or page size options that aren't permitted according to the
        // document template.
        menu.content = menu.content.filter(item => {
            if (item.available && !item.available(this.editor)) {
                return false
            } else if (item.type === 'menu') {
                this.removeUnavailable(item)
            }
            return true
        })
    }

    bindEvents() {
        this.listeners.onclick = event => this.onclick(event)
        document.body.addEventListener('click', this.listeners.onclick)
        this.listeners.onKeydown = event => this.onKeydown(event)
        document.body.addEventListener('keydown', this.listeners.onKeydown)
    }

    destroy() {
        document.body.removeEventListener('click', this.listeners.onclick)
        document.removeEventListener('keydown', this.listeners.onKeydown)
    }

    onclick(event) {
        const target = event.target
        if (target.matches("div#close-document-top a i.fa-times")) {
            // If the user is offline prevent the closing of the document.
            if (this.editor.app.isOffline()) {
                event.preventDefault()
                event.stopPropagation()
                addAlert("info", gettext("Cannot close a document when you're offline."))
            }
        } else if (target.matches('#headerbar #header-navigation .fw-pulldown-item')) {
            // A header nav menu item was clicked. Now we just need to find
            // which one and execute the corresponding action.
            const searchPath = []
            let seekItem = target
            while (seekItem.closest('li')) {
                let itemNumber = 0
                seekItem = seekItem.closest('li')
                while (seekItem.previousElementSibling) {
                    itemNumber++
                    seekItem = seekItem.previousElementSibling
                }
                searchPath.push(itemNumber)
                seekItem = seekItem.parentElement
            }

            seekItem = seekItem.closest('div.header-menu')
            let menuNumber = 0
            while (seekItem.previousElementSibling) {
                menuNumber++
                seekItem = seekItem.previousElementSibling
            }
            const menu = this.editor.menu.headerbarModel.content[menuNumber]

            let menuItem = menu

            while (searchPath.length) {
                menuItem = menuItem.content[searchPath.pop()]
            }

            switch (menuItem.type) {
            case 'action':
                if (menuItem.disabled?.(this.editor)) {
                    return
                }
                menuItem.action(this.editor)
                menu.open = false
                this.closeAllMenu(menu)
                this.parentChain = []
                this.update()
                break
            case 'setting':
                // Similar to 'action' but not closing menu.
                if (menuItem.disabled?.(this.editor)) {
                    return
                }
                menuItem.action(this.editor)
                this.update()
                break
            case 'menu':
                if (this.parentChain.length == 0) {
                    //simple case
                    this.parentChain = [menuItem]
                    this.closeOtherMenu(menu, menuItem)
                } else {
                    let flagCloseAllMenu = true
                    const isMenuItemInParentChain = this.parentChain[this.parentChain.length - 1].content.find(menu => menu.id === menuItem.id)
                    if (isMenuItemInParentChain) {
                        //Do not close all open menus
                        this.parentChain.push(menuItem)
                    } else if (!isMenuItemInParentChain) {

                        for (let index = this.parentChain.length - 2; index >= 0; index--) {

                            if (this.parentChain[index].content.find(menu => menu.id === menuItem.id)) {

                                const noOfRemovals = this.parentChain.length - (index + 1)
                                if (noOfRemovals > 0) {//not last element
                                    this.parentChain.splice(index + 1, noOfRemovals)
                                }
                                this.parentChain.push(menuItem)
                                this.closeOtherMenu(menu, menuItem)
                                flagCloseAllMenu = false
                                break
                            }
                        }
                    }
                    if (flagCloseAllMenu && !isMenuItemInParentChain) {
                        this.closeAllMenu(menu)
                        this.parentChain = [menuItem]
                    }
                }
                menuItem.open = true
                this.update()
                break
            default:
                break
            }
        } else if (target.matches('#headerbar #header-navigation .header-nav-item:not(.disabled)')) {
            // A menu has been clicked, lets find out which one.
            let menuNumber = 0
            let seekItem = target.parentElement
            while (seekItem.previousElementSibling) {
                menuNumber++
                seekItem = seekItem.previousElementSibling
            }
            this.editor.menu.headerbarModel.content.forEach((menu, index) => {
                if (index === menuNumber) {
                    menu.open = true
                } else if (menu.open) {
                    menu.open = false
                    this.closeAllMenu(menu)
                    this.parentChain = []
                }
            })
            this.update()
        } else {
            let needUpdate = false
            this.editor.menu.headerbarModel.content.forEach(menu => {
                if (menu.open) {
                    needUpdate = true
                    menu.open = false
                    this.closeAllMenu(menu)
                    this.parentChain = []
                }
            })
            if (needUpdate) {
                this.update()
            }
        }
    }


    closeAllMenu(menu) {
        menu.content.forEach(menuItem => {
            if (menuItem.type === 'menu' && menuItem.open) {
                menuItem.open = false
                this.closeAllMenu(menuItem)
            }
        })
    }

    closeOtherMenu(menu, currentMenuItem) {
        menu.content.forEach(menuItem => {
            if (menuItem.type === 'menu' && menuItem.open) {
                if (!this.parentChain.includes(menuItem) && currentMenuItem != menuItem) {
                    menuItem.open = false
                }
                this.closeOtherMenu(menuItem, currentMenuItem)
            }
        })
    }


    onKeydown(event) {
        let name = keyName(event)
        if (event.altKey) {
            name = "Alt-" + name
        }
        if (event.ctrlKey) {
            name = "Ctrl-" + name
        }
        if (event.metaKey) {
            name = "Meta-" + name
        }
        if (event.shiftKey) {
            name = "Shift-" + name
        }

        this.editor.menu.headerbarModel.content.forEach(menu => this.checkKeys(event, menu, name))
    }

    checkKeys(event, menu, nameKey) {
        menu.content.forEach(menuItem => {
            if (menuItem.keys === nameKey) {
                event.preventDefault()
                menuItem.action(this.editor)
            } else if (menuItem.content) {
                this.checkKeys(event, menuItem, nameKey)
            }
        })
    }

    update() {
        const diff = this.dd.diff(this.headerEl, this.getHeaderHTML())
        this.dd.apply(this.headerEl, diff)
        if (this.editor.menu.headerbarModel.open) {
            document.body.classList.remove('header-closed')
        } else {
            document.body.classList.add('header-closed')
        }
    }

    getHeaderHTML() {
        const doc = this.editor.view.state.doc
        if (!this.editor.menu.headerbarModel.open) {
            // header is closed
            return '<div></div>'
        }
        let title = ""
        doc.firstChild.firstChild.forEach(
            child => {
                if (!child.marks.find(mark => mark.type.name === 'deletion')) {
                    title += escapeText(child.textContent)
                }
            }
        )
        if (!title.length) {
            title = gettext('Untitled Document')
        }

        return `<div>
            <div id="close-document-top" title="${gettext("Close the document and return to the document overview menu.")}">
                <a href="/">
                    <i class="fa fa-times"></i>
                </a>
            </div>
            <div id="document-top">
                <h1>${title}</h1>
                <nav id="header-navigation">
                    ${this.getHeaderNavHTML()}
                </nav>
                ${this.getParticipantListHTML()}
            </div>
        </div>`
    }

    getParticipantListHTML() {
        const participants = this.editor.mod.collab.participants
        if (participants.length > 1) {
            return `
                <div id="connected-collaborators">
                    ${
    participants.map(participant =>
        participant.avatar.html).join('')
}
                </div>
            `
        } else {
            return ''
        }
    }

    getHeaderNavHTML() {
        return this.editor.menu.headerbarModel.content.map(menu =>
            `
                <div class="header-menu">
                    <span class="header-nav-item${menu.disabled && menu.disabled(this.editor) ? ' disabled' : ''}" title="${menu.tooltip}">
                        ${typeof menu.title === 'function' ? menu.title(this.editor) : menu.title}
                    </span>
                    ${
    menu.open ?
        this.getMenuHTML(menu) :
        ''
}
                </div>
            `
        ).join('')
    }

    getMenuHTML(menu) {
        return `<div class="fw-pulldown fw-left fw-open">
            <ul>
                ${
    menu.content.map(menuItem =>
        `<li>${this.getMenuItemHTML(menuItem)}</li>`
    ).join('')
}
            </ul>
        </div>`
    }

    getMenuItemHTML(menuItem) {
        let returnValue
        switch (menuItem.type) {
        case 'action':
        case 'setting':
            returnValue = this.getActionMenuItemHTML(menuItem)
            break
        case 'menu':
            returnValue = this.getMenuMenuItemHTML(menuItem)
            break
        case 'separator':
            returnValue = '<hr>'
            break
        default:
            break
        }
        return returnValue
    }

    getActionMenuItemHTML(menuItem) {
        return `<span class="fw-pulldown-item${
            menuItem.selected && menuItem.selected(this.editor) ?
                ' selected' :
                ''
        }${
            menuItem.disabled && menuItem.disabled(this.editor) ?
                ' disabled' :
                ''
        }" ${
            menuItem.tooltip ?
                `title="${menuItem.tooltip}"` :
                ''
        }>
            ${
    menuItem.icon ?
        `<i class="fa fa-${menuItem.icon}"></i>` :
        ''
}
            ${typeof menuItem.title === 'function' ? menuItem.title(this.editor) : menuItem.title}
        </span>`
    }

    getMenuMenuItemHTML(menuItem) {
        return `<span class="fw-pulldown-item${
            menuItem.selected && menuItem.selected(this.editor) ?
                ' selected' :
                ''
        }${
            menuItem.disabled && menuItem.disabled(this.editor) ?
                ' disabled' :
                ''
        }" ${
            menuItem.tooltip ?
                `title="${menuItem.tooltip}"` :
                ''
        }>
            ${
    menuItem.icon ?
        `<i class="fa fa-${menuItem.icon}"></i>` :
        ''
}
            ${typeof menuItem.title === 'function' ? menuItem.title(this.editor) : menuItem.title}
            <span class="fw-icon-right"><i class="fa fa-caret-right"></i></span>
        </span>
        ${
    menuItem.open ?
        this.getMenuHTML(menuItem) :
        ''
}`
    }

}
