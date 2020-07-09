import {DiffDOM} from "diff-dom"
import {escapeText, whenReady} from "./basic"

export class OverviewMenuView {
    constructor(overview, model) {
        this.overview = overview
        this.model = model()
        this.dd = new DiffDOM({
            valueDiffing: false
        })
        this.openedMenu = false
        this.listeners = {}
    }

    init() {
        whenReady().then(() => this.bindEvents())
    }

    bindEvents() {
        this.menuEl = document.getElementById('fw-overview-menu')
        this.listeners.onclick = event => this.onclick(event)
        document.body.addEventListener('click', this.listeners.onclick)
        this.listeners.oninput = event => this.oninput(event)
        document.body.addEventListener('input', this.listeners.oninput)
        this.update()
    }

    oninput(event) {
        const target = event.target
        if (target.matches('#fw-overview-menu > li > .fw-button > input')) {
            // A text was enetered in a top entry. we find which one.
            let menuNumber = 0
            let seekItem = target.closest('li')
            while (seekItem.previousElementSibling) {
                menuNumber++
                seekItem = seekItem.previousElementSibling
            }
            const menuItem = this.model.content[menuNumber]
            if (menuItem.input) {
                menuItem.input(this.overview, target.value)
            }

        }
    }

    onclick(event) {
        const target = event.target
        if (target.matches('#fw-overview-menu li li, #fw-overview-menu li li *')) {
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

            if (this.model.content[menuNumber].type === 'dropdown') {
                this.model.content[menuNumber].title = this.model.content[menuNumber].content[itemNumber].title
                this.openedMenu = false
                this.update()
            }
            return false
        } else if (target.matches('#fw-overview-menu li .select-action input[type=checkbox]')) {
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
            const menuItem = this.model.content[menuNumber]

            if (menuItem.checked === true) {
                menuItem.checked = false
                menuItem.uncheckAction(this.overview)
            } else {
                menuItem.checked = true
                menuItem.checkAction(this.overview)
            }
            return true
        } else if (target.matches('#fw-overview-menu li, #fw-overview-menu li *')) {
            // A toolbar dropdown menu item was clicked. We just need to
            // find out which one
            let menuNumber = 0
            let seekItem = target.closest('li')
            while (seekItem.previousElementSibling) {
                menuNumber++
                seekItem = seekItem.previousElementSibling
            }
            const menuItem = this.model.content[menuNumber]
            // if it is a dropdown menu, open it. Otherwise execute an
            // associated action.
            if (['dropdown', 'select-action-dropdown'].includes(menuItem.type)) {
                event.preventDefault()
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
                this.update()
            } else if (menuItem.action) {
                event.preventDefault()
                menuItem.action(this.overview)
                if (this.openedMenu !== false) {
                    this.model.content[this.openedMenu].open = false
                    this.openedMenu = false
                }
                this.update()
            }
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
        const diff = this.dd.diff(this.menuEl, this.getMenuHTML())
        this.dd.apply(this.menuEl, diff)
    }

    getMenuHTML() {
        return `<ul id="fw-overview-menu">${
            this.model.content.map(menuItem =>
                `<li class="fw-overview-menu-item${menuItem.id ? ` ${menuItem.id}` : ''} ${menuItem.type}">${
                    this.getMenuItemHTML(menuItem)
                }</li>`
            ).join('')
        }</ul>`
    }

    getMenuItemHTML(menuItem) {
        let returnValue
        switch (menuItem.type) {
        case 'dropdown':
            returnValue = this.getDropdownHTML(menuItem)
            break
        case 'select-action-dropdown':
            returnValue = this.getSelectionActionDropdownHTML(menuItem)
            break
        case 'text':
            returnValue = this.getTextHTML(menuItem)
            break
        case 'button':
            returnValue = this.getButtonHTML(menuItem)
            break
        case 'search':
            returnValue = this.getSearchHTML(menuItem)
            break
        default:
            returnValue = ''
            break
        }
        return returnValue
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
        <div class="dropdown fw-dropdown-menu">
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
        <button class="fw-button fw-light fw-large" title="${menuItem.title}">
            ${menuItem.title}
            ${
    menuItem.icon ?
        `<i class="fa fa-${menuItem.icon}"></i>` :
        ''
}
        </button>`
    }

    getTextHTML(menuItem) {
        return `<button class="fw-text-menu" title="${menuItem.title}">${menuItem.title}</button>`
    }

    getSearchHTML(menuItem) {
        return `
        <div class="fw-button fw-light fw-large disabled">
            <input type="text" placeholder="${menuItem.title}" aria-label="${menuItem.title}">
            ${menuItem.icon ? `<i class="fa fa-${menuItem.icon}"></i>` : ''}
        </div>`
    }

}
