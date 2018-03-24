import diffDOM from "diff-dom"
import keyName from "w3c-keyname"
import {keydownHandler} from "prosemirror-keymap"
import {escapeText, whenReady} from "./basic"

export class OverviewMenuView {
    constructor(overview, model) {
        this.overview = overview
        this.model = model
        this.dd = new diffDOM({
            valueDiffing: false
        })
        this.openedMenu = false
        this.listeners = {}
    }

    init() {
        whenReady().then(()=>this.bindEvents())
    }

    bindEvents() {
        this.menuEl = document.getElementById('fw-overview-menu')
        this.listeners.onmousedown = event => this.onmousedown(event)
        document.body.addEventListener('mousedown', this.listeners.onmousedown)
        this.update()
    }

    onmousedown(event) {
        let target = event.target
        if(target.matches('#fw-overview-menu li li, #fw-overview-menu li li *')) {
            event.preventDefault()
            let itemNumber = 0
            let seekItem = target.closest('li')
            while (seekItem.previousElementSibling) {
                itemNumber++
                seekItem = seekItem.previousElementSibling
            }
            let menuNumber = 0
            seekItem = seekItem.parentElement.parentElement.parentElement
            while (seekItem.previousElementSibling) {
                menuNumber++
                seekItem = seekItem.previousElementSibling
            }
            this.model.content[menuNumber].content[itemNumber].action(this.overview)
            this.model.content[menuNumber].open = false

            if (this.model.content[menuNumber].type==='dropdown') {
                this.model.content[menuNumber].title =
                    this.model.content[menuNumber].content[itemNumber].title
            }
            return false
        } else if(target.matches('#fw-overview-menu li .select-action input[type=checkbox]')) {
            event.preventDefault()
            event.stopImmediatePropagation()
            event.stopPropagation()
            // A toolbar dropdown menu item was clicked. We just need to
            // find out which one
            let menuNumber = 0
            let seekItem = target.closest('li')
            while (seekItem.previousElementSibling) {
                menuNumber++
                seekItem = seekItem.previousElementSibling
            }
            let menuItem = this.model.content[menuNumber]

            if (menuItem.checked === true) {
                menuItem.checked = false
                menuItem.uncheckAction(this.overview)
            } else {
                menuItem.checked = true
                menuItem.checkAction(this.overview)
            }
            let that = this
            return true
        } else if(target.matches('#fw-overview-menu li, #fw-overview-menu li *')) {
            event.preventDefault()
            // A toolbar dropdown menu item was clicked. We just need to
            // find out which one
            let menuNumber = 0
            let seekItem = target.closest('li')
            while (seekItem.previousElementSibling) {
                menuNumber++
                seekItem = seekItem.previousElementSibling
            }
            let menuItem = this.model.content[menuNumber]
            // if it is a dropdown menu, open it. Otherwise execute an
            // associated action.
            if (['dropdown', 'select-action-dropdown'].includes(menuItem.type)) {
                if (this.openedMenu === menuNumber) {
                    this.model.content[this.openedMenu].open = false
                    this.openedMenu = false
                } else {
                    if (this.openedMenu !== false) {
                        this.model.content[this.openedMenu].open = false
                    }
                    menuItem.open = true
                    this.openedMenu = menuNumber
                }

            } else if (menuItem.action) {
                menuItem.action(this.overview)
                if (this.openedMenu !== false) {
                    this.model.content[this.openedMenu].open = false
                    this.openedMenu = false
                }
            }
            this.update()
            return false
        } else if (this.openedMenu !== false) {
            this.model.content[this.openedMenu].open = false
            this.openedMenu = false
            this.update()
        }
    }

    update() {
        if (!this.menuEl) {
            // page has not yet been loaded. abort
            return
        }
        let tempEl = document.createElement('div')
        tempEl.innerHTML = this.getMenuHTML()
        let newMenuEl = tempEl.firstElementChild
        let diff = this.dd.diff(this.menuEl, newMenuEl)
        this.dd.apply(this.menuEl, diff)
    }

    getMenuHTML() {
        return `<ul id="fw-overview-menu">${
            this.model.content.map(menuItem =>
                `<li class="fw-overview-menu-item">${
                    this.getMenuItemHTML(menuItem)
                }</li>`
            ).join('')
        }</ul>`
    }

    getMenuItemHTML(menuItem) {
        switch(menuItem.type) {
            case 'dropdown':
                return this.getDropdownHTML(menuItem)
                break
            case 'select-action-dropdown':
                return this.getSelectionActionDropdownHTML(menuItem)
                break
            case 'button':
                return this.getButtonHTML(menuItem)
                break
            default:
                return ''
                break
        }
    }


    getSelectionActionDropdownHTML(menuItem) {
        return `
        <div class="select-action fw-button fw-light fw-large">
            <input type="checkbox" ${
                menuItem.checked ?
                'checked' :
                ''
            }>
            <span class="select-action-dropdown"><i class="fa fa-caret-down"></i></span>
        </div>
        ${this.getDropdownListHTML(menuItem)}
        `
    }

    getDropdownHTML(menuItem) {
        return `
        <div class="dropdown fw-button fw-light fw-large">
            <label>${
                menuItem.title ?
                escapeText(menuItem.title) :
                menuItem.content.length ?
                escapeText(menuItem.content[0].title) :
                ''
            }</label>
            <span class="dropdown"><i class="fa fa-caret-down"></i></span>
        </div>
        ${this.getDropdownListHTML(menuItem)}
        `
    }

    getDropdownListHTML(menuItem) {
        if (menuItem.open) {
            return `<div class="fw-pulldown fw-left" style="display: block;"><ul>${
                menuItem.content.map(menuOption => this.getDropdownOptionHTML(menuOption)).join('')
            }</ul></div>`
        } else {
            return ''
        }
    }

    getDropdownOptionHTML(menuOption) {
        return `
        <li>
            <span class="fw-pulldown-item">
                ${escapeText(menuOption.title)}
            </span>
        </li>
        `
    }

    getButtonHTML(menuItem) {
        return `
        <button class="import-fidus fw-button fw-light fw-large" title="${menuItem.title}">
            ${menuItem.title}
            ${
                menuItem.icon ?
                `<i class="fa fa-${menuItem.icon}"></i>` :
                ''
            }
        </button>`
    }

}
