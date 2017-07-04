import diffDOM from "diff-dom"
import keyName from "w3c-keyname"
import {keydownHandler} from "prosemirror-keymap"
import {escapeText} from "../../common"

export class HeaderView {
    constructor(editorView, options) {
        this.editorView = editorView
        this.options = options

        this.editor = this.options.editor
        this.editor.menu.headerView = this

        this.dd = new diffDOM()
        this.headerEl = document.querySelector('header')
        this.openedMenu = false
        this.bindEvents()
        this.update()
    }

    bindEvents() {
        document.body.addEventListener('click', event => {
            if (this.openedMenu !== false) {
                this.editor.menu.headerModel[this.openedMenu].open = false
                this.openedMenu = false
                this.update()
            }
            let target = event.target

            if(target.matches('header #header-navigation .fw-pulldown-item:not(.disabled)')) {
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
                this.editor.menu.headerModel[menuNumber].content[itemNumber].action(this.editor)
                this.editor.menu.headerModel[menuNumber].open = false
                this.openedMenu = false
                this.update()
            } else if (target.matches('header #header-navigation .header-nav-item:not(.disabled)')) {
                // A menu has been clicked, lets find out which one.
                let menuNumber = 0
                let seekItem = target.parentElement
                while (seekItem.previousElementSibling) {
                    menuNumber++
                    seekItem = seekItem.previousElementSibling
                }
                this.editor.menu.headerModel[menuNumber].open = true
                this.openedMenu = menuNumber
                this.update()
            } else if (target.matches('#open-close-header, #open-close-header *')) {
                let headerTop = -92,
                    toolnavTop = 0,
                    contentTop = 108
                if (target.classList.contains('header-closed')) {
                    target.classList.remove('header-closed')
                    headerTop = 0
                    toolnavTop = 92
                    contentTop = 200
                } else {
                    target.classList.add('header-closed')
                }
                jQuery('#document-top').stop().animate({
                    'top': headerTop
                })
                jQuery('#editor-navigation').stop().animate({
                    'top': toolnavTop
                })
                jQuery('#pagination-layout').stop()
                .animate({
                    'top': contentTop
                }, {
                    'complete': function() {
                        this.editor.mod.comments.layout.layoutComments()
                    }
                })
            }

        })
        document.addEventListener('keydown', event => this.keydown(event))

    }

    keydown(event) {

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
        console.log(name)
        this.editor.menu.headerModel.forEach(menu => {
            menu.content.forEach(menuItem => {
                if (menuItem.keys && menuItem.keys===name) {
                    event.preventDefault()
                    menuItem.action(this.editor)
                }
            })
        })
    }

    update() {
        let newHeader = document.createElement('header')
        newHeader.innerHTML = this.getHeaderHTML()
        let diff = this.dd.diff(this.headerEl, newHeader)
        this.dd.apply(this.headerEl, diff)
    }

    getHeaderHTML() {
        let doc = this.editor.view.state.doc
        return `
            <div id="close-document-top" class="close icon-cancel-circle" title="${gettext("Close the document and return to the document overview menu.")}"></div>
            <div id="document-top">
                <h1>${escapeText(doc.firstChild.textContent)}</h1>
                <nav id="header-navigation">
                    ${this.getHeaderNavHTML()}
                </nav>
                <div id="connected-collaborators"></div>
            </div>
        `
    }

    getHeaderNavHTML() {
        let headerNavHTML = ''
        this.editor.menu.headerModel.forEach(menu => {
            headerNavHTML += `
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
        })
        return headerNavHTML
    }

    getHeaderMenuHTML(menu) {
        let menuHTML = ''
        menu.content.forEach(menuItem => {
            menuHTML += `
                <li>
                    <span class="fw-pulldown-item${menuItem.icon ? ' icon-' + menuItem.icon : ''}${menuItem.selected && menuItem.selected(this.editor) ? ' selected' : ''}${menuItem.disabled && menuItem.disabled(this.editor) ? ' disabled' : ''}" title="${menuItem.tooltip}"> ${menuItem.title} </span>
                </li>
            `
        })
        return menuHTML
    }

}
