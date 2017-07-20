import diffDOM from "diff-dom"
import keyName from "w3c-keyname"
import {keydownHandler} from "prosemirror-keymap"
import {escapeText} from "../../common"

export class HeaderbarView {
    constructor(editorView, options) {
        this.editorView = editorView
        this.options = options

        this.editor = this.options.editor
        this.editor.menu.headerView = this

        this.dd = new diffDOM()
        this.headerEl = document.querySelector('#headerbar').firstElementChild
        this.openedMenu = false
        this.listeners = {}


        this.bindEvents()
        this.update()
    }

    bindEvents() {
        this.listeners.onclick = event => this.onclick(event)
        document.body.addEventListener('click', this.listeners.onclick)
        this.listeners.onkeydown = event => this.onkeydown(event)
        document.addEventListener('keydown', this.listeners.onkeydown)

    }

    destroy() {
        document.body.removeEventListener('click', this.listeners.onclick)
        document.removeEventListener('keydown', this.listeners.onkeydown)
    }

    onclick(event) {
        if (this.openedMenu !== false) {
            this.editor.menu.headerbarModel.content[this.openedMenu].open = false
            this.openedMenu = false
            this.update()
        }
        let target = event.target

        if(target.matches('#headerbar #header-navigation .fw-pulldown-item:not(.disabled)')) {
            // A header nav menu item was clicked. Now we just need to find
            // which one and execute the corresponding action.
            let itemNumber = 0
            let seekItem = target.parentElement
            while (seekItem.previousElementSibling) {
                itemNumber++
                seekItem = seekItem.previousElementSibling
            }
            seekItem = seekItem.parentElement.parentElement.parentElement
            let menuNumber = 0
            while (seekItem.previousElementSibling) {
                menuNumber++
                seekItem = seekItem.previousElementSibling
            }
            this.editor.menu.headerbarModel.content[menuNumber].content[itemNumber].action(this.editor)
            this.editor.menu.headerbarModel.content[menuNumber].open = false
            this.openedMenu = false
            this.update()
        } else if (target.matches('#headerbar #header-navigation .header-nav-item:not(.disabled)')) {
            // A menu has been clicked, lets find out which one.
            let menuNumber = 0
            let seekItem = target.parentElement
            while (seekItem.previousElementSibling) {
                menuNumber++
                seekItem = seekItem.previousElementSibling
            }
            this.editor.menu.headerbarModel.content[menuNumber].open = true
            this.openedMenu = menuNumber
            this.update()
        }
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

        this.editor.menu.headerbarModel.content.forEach(menu => {
            menu.content.forEach(menuItem => {
                if (menuItem.keys && menuItem.keys===name) {
                    event.preventDefault()
                    menuItem.action(this.editor)
                }
            })
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
            <div id="close-document-top" class="close icon-cancel-circle" title="${gettext("Close the document and return to the document overview menu.")}"></div>
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
                    ${participants.map(participant =>
                        `<img src="${participant.avatar}" alt="${escapeText(participant.name)}" title="${escapeText(participant.name)}" class="avatar user-${participant.colorId}">`).join('')
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
                        ${menu.title}
                    </span>
                    <div class="fw-pulldown fw-left"${menu.open ? ' style="display:block"': ''}>
                        <ul>
                            ${this.getHeaderMenuHTML(menu)}
                        </ul>
                    </div>
                </div>
            `
        ).join('')
    }

    getHeaderMenuHTML(menu) {
        return menu.content.map(menuItem =>
            `
                <li>
                    <span class="fw-pulldown-item${menuItem.icon ? ' icon-' + menuItem.icon : ''}${menuItem.selected && menuItem.selected(this.editor) ? ' selected' : ''}${menuItem.disabled && menuItem.disabled(this.editor) ? ' disabled' : ''}" title="${menuItem.tooltip}"> ${menuItem.title} </span>
                </li>
            `
        ).join('')
    }

}
