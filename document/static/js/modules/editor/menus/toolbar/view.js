import diffDOM from "diff-dom"
import keyName from "w3c-keyname"
import {keydownHandler} from "prosemirror-keymap"

import {escapeText} from "../../../common"

export class ToolbarView {
    constructor(editorView, options) {
        this.editorView = editorView
        this.options = options

        this.editor = this.options.editor
        if (!this.editor.menu.toolbarViews) {
            this.editor.menu.toolbarViews = []
        }
        this.editor.menu.toolbarViews.push(this)

        this.dd = new diffDOM()
        this.toolbarEl = document.querySelector('#toolbar').firstElementChild
        this.sideMargins = 14 + 14 + 42 // CSS sets left margin to 14px + 42 px for left most button and we want the same margin on both sides
        this.availableWidth = window.innerWidth - this.sideMargins
        this.openedMenu = false
        this.listeners = {}

        this.bindEvents()
        this.update()
    }

    bindEvents() {
        this.listeners.onresize = event => this.onresize(event)
        window.addEventListener('resize', this.listeners.onresize)
        this.listeners.onclick = event => this.onclick(event)
        document.body.addEventListener('click', this.listeners.onclick)
    }

    destroy() {
        window.removeEventListener('resize', this.listeners.onresize)
        document.body.removeEventListener('click', this.listeners.onclick)
    }

    onresize(event) {
        // recalculate menu if needed
        this.availableWidth = window.innerWidth - this.sideMargins
        this.update()
    }

    onclick(event) {
        if (this.editorView !== this.editor.currentView) {
            // the other editor must be active
            return
        }
        let target = event.target
        if(target.matches('.editortoolbar .more-button li:not(.disabled), .editortoolbar .more-button li:not(.disabled) *')) {
            let menuNumber = 0
            let seekItem = target.closest('li')
            while (seekItem.previousElementSibling) {
                menuNumber++
                seekItem = seekItem.previousElementSibling
            }
            seekItem = seekItem.parentElement.parentElement.parentElement.parentElement
            while (seekItem.previousElementSibling) {
                menuNumber++
                seekItem = seekItem.previousElementSibling
            }
            let menuItem = this.editor.menu.toolbarModel.content[menuNumber]
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
                this.editor.menu.toolbarModel.openMore = false
                this.update()
                this.editor.currentView.focus()
            }

        } else if(target.matches('.editortoolbar .more-button, .editortoolbar .more-button *')) {
            this.editor.menu.toolbarModel.openMore = true
            if (this.openedMenu) {
                this.editor.menu.toolbarModel.content[this.openedMenu].open = false
            }
            this.update()
        } else if(target.matches('.editortoolbar li:not(.disabled), .editortoolbar li:not(.disabled) *')) {
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
            this.editor.menu.toolbarModel.content[menuNumber].content[itemNumber].action(this.editor)
            this.editor.menu.toolbarModel.content[menuNumber].open = false
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
            let menuItem = this.editor.menu.toolbarModel.content[menuNumber]
            // if it is a dropdown menu, open it. Otherwise execute an
            // associated action.
            if (menuItem.type==='dropdown') {
                menuItem.open = true
                this.openedMenu = menuNumber
                this.editor.menu.toolbarModel.openMore = false
                event.preventDefault()
                this.update()
            } else if (menuItem.action) {
                event.preventDefault()
                menuItem.action(this.editor)
                this.update()
                this.editor.currentView.focus()
            }
        } else if (this.openedMenu !== false || this.editor.menu.toolbarModel.openMore) {
            if (this.openedMenu !== false) {
                this.editor.menu.toolbarModel.content[this.openedMenu].open = false
            }
            this.editor.menu.toolbarModel.openMore = false
            this.openedMenu = false
            this.update()
        }
    }

    update() {
        if (this.editorView !== this.editor.currentView) {
            // the other editor must be active
            return
        }
        let spaceCounter = this.availableWidth
        let menuIndexToDrop = false
        this.editor.menu.toolbarModel.content.some((menuItem, index) => {
            switch (menuItem.type) {
                case 'info':
                    spaceCounter -= 98
                    break
                case 'dropdown':
                    spaceCounter -= 109
                    break
                default:
                    spaceCounter -= 49
            }
            if (spaceCounter < 0) {
                menuIndexToDrop = index - 2 // We need the space of two buttons for the more button
                return true
            }
        })
        let newToolbar = document.createElement('div')
        newToolbar.innerHTML = this.getToolbarHTML(menuIndexToDrop)
        let toolbarEl = document.querySelector('#toolbar').firstElementChild
        let diff = this.dd.diff(toolbarEl, newToolbar)
        this.dd.apply(toolbarEl, diff)
    }

    getToolbarHTML(menuIndexToDrop) {
        return `
            <div class="editortoolbar">
                ${this.editor.menu.toolbarModel.content.map((menuItem, index) => {
                    if (!menuIndexToDrop || index < menuIndexToDrop) {
                        return `
                            <div class="ui-buttonset${menuItem.disabled && menuItem.disabled(this.editor) ? ' disabled' : ''}">
                                ${this.getToolbarMenuItemHTML(menuItem, index)}
                            </div>
                        `
                    } else {
                        return ''
                    }
                }).join('')}
                ${this.getMoreButtonHTML(menuIndexToDrop)}
            </div>
        `
    }

    getToolbarMenuItemHTML(menuItem, index) {
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

    getMoreButtonHTML(menuIndexToDrop) {
        if (menuIndexToDrop) {
            return `
                <div class="ui-buttonset more-button">
                    <div class="multiButtons">
                        <span class="multibuttonsCover fw-button fw-light fw-large edit-button">
                            ${gettext('More')}
                        </span>
                        ${this.getMoreButtonListHTML(menuIndexToDrop)}
                    </div>
                </div>
            `
        } else {
            return ''
        }
    }

    getMoreButtonListHTML(menuIndexToDrop) {
        if (this.editor.menu.toolbarModel.openMore) {
            let remainingItems = this.editor.menu.toolbarModel.content.slice(menuIndexToDrop)
            return `
                <div class="fw-pulldown fw-left" style="display: block;">
                    <ul>${remainingItems.map(menuOption => this.getDropdownOptionHTML(menuOption)).join('')}</ul>
                </div>
            `
        } else {
            return ''
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
        <li class="ui-button ui-widget ui-state-default ui-corner-all ui-button-text-only${menuOption.disabled && menuOption.disabled(this.editor) ? ' disabled' : ''}" role="button" aria-disabled="false">
            <span class="ui-button-text">
                <input type="radio" >
                <label class="fw-pulldown-item">${menuOption.title}</label>
            </span>
        </li>
        `
    }

    getButtonHTML(menuItem) {
        return `
        <button aria-label="${menuItem.title}" class="fw-button fw-light fw-large fw-square edit-button${menuItem.disabled && menuItem.disabled(this.editor) ? ' disabled' : ''}${menuItem.selected && menuItem.selected(this.editor) ? ' ui-state-active' : ''}${menuItem.class ? ` ${menuItem.class(this.editor)}` : ''}" title="${menuItem.title}" >
            <span class="ui-button-text">
                <i class="fa fa-${typeof(menuItem.icon) === 'function' ? menuItem.icon(this.editor) : menuItem.icon}"></i>
            </span>
        </button>`
    }

}
