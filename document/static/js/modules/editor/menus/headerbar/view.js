import diffDOM from "diff-dom"
import keyName from "w3c-keyname"
import {keydownHandler} from "prosemirror-keymap"

import {escapeText} from "../../../common"

export class HeaderbarView {
    constructor(editorView, options) {
        this.editorView = editorView
        this.options = options

        this.editor = this.options.editor
        this.editor.menu.headerView = this

        this.dd = new diffDOM()
        this.headerEl = document.querySelector('#headerbar').firstElementChild
        this.listeners = {}


        this.bindEvents()
        this.update()
    }

    bindEvents() {
        this.listeners.onclick = event => this.onclick(event)
        document.body.addEventListener('click', this.listeners.onclick)
        this.listeners.onkeydown = event => this.onkeydown(event)
        document.body.addEventListener('keydown', this.listeners.onkeydown)
    }

    destroy() {
        document.body.removeEventListener('click', this.listeners.onclick)
        document.removeEventListener('keydown', this.listeners.onkeydown)
    }

    onclick(event) {
        let target = event.target

        if(target.matches('#headerbar #header-navigation .fw-pulldown-item')) {
            // A header nav menu item was clicked. Now we just need to find
            // which one and execute the corresponding action.
            let searchPath = [], seekItem = target
            while(seekItem.closest('li')) {
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
            let menu = this.editor.menu.headerbarModel.content[menuNumber]

            let menuItem = menu

            while(searchPath.length) {
                menuItem = menuItem.content[searchPath.pop()]
            }

            switch (menuItem.type) {
                case 'action':
                    if (menuItem.disabled && menuItem.disabled(this.editor)) {
                        return
                    }
                    menuItem.action(this.editor)
                    menu.open = false
                    this.closeMenu(menu)
                    this.update()
                    break;
                case 'setting':
                    // Similar to 'action' but not closing menu.
                    if (menuItem.disabled && menuItem.disabled(this.editor)) {
                        return
                    }
                    menuItem.action(this.editor)
                    this.update()
                    break;
                case 'menu':
                    this.closeMenu(menu)
                    menuItem.open = true
                    this.update()
                    break;
                default:
                    break;
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
                if (index===menuNumber) {
                    menu.open = true
                } else if (menu.open) {
                    menu.open = false
                    this.closeMenu(menu)
                }
            })
            this.update()
        } else {
            let needUpdate = false
            this.editor.menu.headerbarModel.content.forEach(menu => {
                if (menu.open) {
                    needUpdate = true
                    menu.open = false
                    this.closeMenu(menu)
                }
            })
            if (needUpdate) {
                this.update()
            }
        }
    }

    closeMenu(menu) {
        menu.content.forEach(menuItem => {
            if (menuItem.type === 'menu' && menuItem.open) {
                menuItem.open = false
                this.closeMenu(menuItem)
            }
        })
    }

    onkeydown(event) {
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
            if (menuItem.keys && menuItem.keys===nameKey) {
                event.preventDefault()
                menuItem.action(this.editor)
            } else if (menuItem.content) {
                this.checkKeys(event, menuItem, nameKey)
            }
        })
    }

    update() {
        let newHeader = document.createElement('div')
        newHeader.innerHTML = this.getHeaderHTML()
        let diff = this.dd.diff(this.headerEl, newHeader)
        this.dd.apply(this.headerEl, diff)
    }

    getHeaderHTML() {
        let doc = this.editor.view.state.doc
        if (!this.editor.menu.headerbarModel.open) {
            // header is closed
            return ''
        }
        return `
            <div id="close-document-top" title="${gettext("Close the document and return to the document overview menu.")}">
                <a href="/">
                    <i class="fa fa-times"></i>
                </a>
            </div>
            <div id="document-top">
                <h1>${doc.firstChild.firstChild.textContent.length ? escapeText(doc.firstChild.firstChild.textContent) : gettext('Untitled Document')}</h1>
                <nav id="header-navigation">
                    ${this.getHeaderNavHTML()}
                </nav>
                ${this.getParticipantListHTML()}
            </div>
        `
    }

    getParticipantListHTML() {
        let participants = this.editor.mod.collab.participants
        if (participants.length > 1) {
            return `
                <div id="connected-collaborators">
                    ${
                        participants.map(participant =>
                            `<img src="${participant.avatar}" alt="${
                                escapeText(participant.name)
                            }" title="${
                                escapeText(participant.name)
                            }" class="avatar user-${
                                participant.id
                            }">`).join('')
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
        switch(menuItem.type) {
            case 'action':
            case 'setting':
                return this.getActionMenuItemHTML(menuItem)
                break;
            case 'menu':
                return this.getMenuMenuItemHTML(menuItem)
                break;
            case 'separator':
                return '<hr>'
            default:
                break;
        }
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
