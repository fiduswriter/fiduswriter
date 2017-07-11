import diffDOM from "diff-dom"
import keyName from "w3c-keyname"
import {keydownHandler} from "prosemirror-keymap"
import {escapeText} from "../../common"

export class ToolbarView {
    constructor(editorView, options) {
        this.editorView = editorView
        this.options = options

        this.editor = this.options.editor
        this.editor.menu.toolbarView = this

        this.dd = new diffDOM()
        this.toolbarEl = document.querySelector('#editor-tools-wrapper').firstElementChild
        this.openedMenu = false
        this.bindEvents()
        this.update()
    }

    bindEvents() {
        document.body.addEventListener('click', event => {
            if (this.editorView !== this.editor.currentView) {
                // the other editor must be active
                return
            }
            let target = event.target
            if(target.matches('.editortoolbar li:not(.disabled), .editortoolbar li:not(.disabled) *')) {
                // A toolbar dropdown menu item was clicked. We just need to
                // find out which one
                let itemNumber = 0
                let seekItem = target.closest('li')
                while (seekItem.previousElementSibling) {
                    itemNumber++
                    seekItem = seekItem.previousElementSibling
                }
                seekItem = seekItem.parentElement.parentElement.parentElement.parentElement
                let menuNumber = 0
                while (seekItem.previousElementSibling) {
                    menuNumber++
                    seekItem = seekItem.previousElementSibling
                }
                event.preventDefault()
                this.editor.menu.toolbarModel[menuNumber].content[itemNumber].action(this.editor)
                this.editor.menu.toolbarModel[menuNumber].open = false
                this.openedMenu = false
                this.update()
                this.editor.currentView.focus()
            } else if (target.matches('.editortoolbar > div:not(.disabled), .editortoolbar > div:not(.disabled) *')) {
                // A menu item has been clicked, lets find out which one.
                let menuNumber = 0
                let seekItem = target.closest('div.ui-buttonset')
                while (seekItem.previousElementSibling) {
                    menuNumber++
                    seekItem = seekItem.previousElementSibling
                }
                let menuItem = this.editor.menu.toolbarModel[menuNumber]
                // if it is a dropdown menu, open it. Otherwise execute an
                // associated action.
                if (menuItem.type==='dropdown') {
                    menuItem.open = true
                    this.openedMenu = menuNumber
                    event.preventDefault()
                    this.update()
                } else if (menuItem.action) {
                    event.preventDefault()
                    menuItem.action(this.editor)
                    this.editor.currentView.focus()
                }
            } else if (this.openedMenu !== false) {
                this.editor.menu.toolbarModel[this.openedMenu].open = false
                this.openedMenu = false
                this.update()
            }

        })
    }

    update() {
        if (this.editorView !== this.editor.currentView) {
            // the other editor must be active
            return
        }
        let newToolbar = document.createElement('div')
        newToolbar.innerHTML = this.getToolbarHTML()
        let diff = this.dd.diff(this.toolbarEl, newToolbar)
        this.dd.apply(this.toolbarEl, diff)
    }

    getToolbarHTML() {
        let doc = this.editor.view.state.doc
        return `
            <div class="editortoolbar">
                ${this.editor.menu.toolbarModel.map(menuItem =>
                    `<div class="ui-buttonset">
                        ${this.getToolbarMenuItemHTML(menuItem)}
                    </div>`
                ).join('')}
            </div>
        `
    }

    getToolbarMenuItemHTML(menuItem) {
        switch(menuItem.type) {
            case 'info':
                return this.getInfoHTML(menuItem)
                break
            case 'dropdown':
                return this.getDropdownHTML(menuItem)
                break
            case 'button':
                return this.getButtonHTML(menuItem)
                break
            default:
                return ''
                break
        }
    }

    getInfoHTML(menuItem) {
        return `<div class="info">${menuItem.show(this.editor)}</div>`
    }

    getDropdownHTML(menuItem) {
        return `
        <div class="multiButtons">
            <span class="multibuttonsCover fw-button fw-light fw-large edit-button${menuItem.disabled && menuItem.disabled(this.editor) ? ' disabled' : ''}">
                ${menuItem.show(this.editor)}
            </span>
            ${this.getDropdownListHTML(menuItem)}
        </div>
        `
    }

    getDropdownListHTML(menuItem) {
        if (menuItem.open) {
            return `<div class="fw-pulldown fw-left" style="display: block;"><ul>${menuItem.content.map(menuOption => this.getDropdownOptionHTML(menuOption)).join('')}</ul></div>`
        } else {
            return ''
        }
    }

    getDropdownOptionHTML(menuOption) {
        return `
        <li class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only" role="button" aria-disabled="false">
            <span class="ui-button-text">
                <input type="radio" >
                <label class="fw-pulldown-item">${menuOption.title}</label>
            </span>
        </li>
        `
    }

    getButtonHTML(menuItem) {
        return `
        <button class="fw-button fw-light fw-large fw-square edit-button${menuItem.disabled && menuItem.disabled(this.editor) ? ' disabled' : ''}${menuItem.selected && menuItem.selected(this.editor) ? ' ui-state-active' : ''}" title="${menuItem.title}">
            <span class="ui-button-text">
                <i class="icon-${menuItem.icon}"></i>
            </span>
        </button>`
    }

}
