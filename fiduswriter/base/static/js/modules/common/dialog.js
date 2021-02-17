import {keyName} from "w3c-keyname"

import {findTarget} from "./basic"

const dialogTemplate = ({id, classes, title, height, width, icon, buttons, zIndex, body, scroll, help, canClose, note}) =>
    `<div tabindex="-1" role="dialog"
        class="ui-dialog ui-corner-all ui-widget ui-widget-content ui-front ui-dialog-buttons"
        ${id ? `aria-describedby="${id}"` : ''} style="z-index: ${zIndex};">
    <div class="ui-dialog-titlebar ui-corner-all ui-widget-header ui-helper-clearfix">
        ${icon ? `<i class="fa fa-${icon}" aria-hidden="true"></i>` : ''}
        <span id="ui-id-2" class="ui-dialog-title">${title}</span>
        ${help ? `<button type="button" class="ui-button ui-corner-all ui-widget ui-button-icon-only ui-dialog-titlebar-help" title="${gettext('Help')}">
            <span class="ui-button-icon ui-icon ui-icon-help"> </span>
            <span class="ui-button-icon-space"> </span>
            ${gettext('Help')}
        </button>` : ''}
        ${canClose ? `<button type="button" class="ui-button ui-corner-all ui-widget ui-button-icon-only ui-dialog-titlebar-close" title="${gettext('Close')}">
            <span class="ui-button-icon ui-icon ui-icon-closethick"> </span>
            <span class="ui-button-icon-space"> </span>
            ${gettext('Close')}
        </button>` : ''}

    </div>
    <div ${id ? `id="${id}"` : ''} class="ui-dialog-content ui-widget-content${classes ? ` ${classes}` : ''}${scroll ? ` ui-scrollable` : ''}" style="width: ${width}; height: ${height};">
        ${note.text ? `<div class="note-container">${noteTemplate(note)}</div>` : ''}
        ${body}
    </div>
    <div class="ui-dialog-buttonpane ui-widget-content ui-helper-clearfix">
        <div class="ui-dialog-buttonset">${buttonsTemplate({buttons})}</div>
    </div>
</div>
<div class="ui-widget-overlay ui-front" style="z-index: ${zIndex - 1}"></div>`

const noteTemplate = (note) => {
    return note.text ? `<p class="noteEl ${note.display ? `` : `hide`}">${note.text}</p>` : ``
}

const buttonsTemplate = ({buttons}) => buttons.map(button => buttonTemplate(button)).join('')

const buttonTemplate = ({text, classes, icon}) => `<button type="button" class="${classes ? classes : 'fw-light'} fw-button ui-button ui-corner-all ui-widget">
    ${icon ? `<i class="fa fa-${icon}" aria-hidden="true"></i>` : ''}
    ${text}
</button>`

const BUTTON_TYPES = {
    close: {
        text: gettext('Close'),
        classes: 'fw-orange',
        click: dialog => () => dialog.close()
    },
    cancel: {
        text: gettext('Cancel'),
        classes: 'fw-orange',
        click: dialog => () => dialog.close()
    },
    ok: {
        text: gettext('OK'),
        classes: 'fw-dark',
        click: dialog => () => dialog.close()
    }
}

export class Dialog {
    constructor(options) {
        this.id = options.id || false
        this.classes = options.classes || false
        this.title = options.title || ''
        this.body = options.body || ''
        this.height = options.height ? `${options.height}px` : 'auto'
        this.width = options.width ? `${options.width}px` : 'auto'
        this.canClose = 'canClose' in options ? options.canClose : true
        this.help = 'help' in options ? options.help : false
        this.note = 'note' in options ? options.note : {}
        this.buttons = []
        if (options.buttons) {
            this.setButtons(options.buttons)
        }
        this.beforeClose = options.beforeClose || false
        this.onClose = options.onClose || false
        this.icon = options.icon || false
        this.scroll = options.scroll || false
        this.canEscape = options.canEscape || false
        this.dialogEl = false
        this.backdropEl = false
        this.dragging = false
        this.hasBeenMoved = false
        this.listeners = {}
        this.fullScreen = options.fullScreen ? options.fullScreen : false
    }

    setButtons(buttons) {
        this.buttons = buttons.map(button => ({
            text: button.text ? button.text : button.type ? BUTTON_TYPES[button.type].text : '',
            classes: button.classes ? button.classes : button.type ? BUTTON_TYPES[button.type].classes : false,
            click: button.click ? button.click : button.type ? BUTTON_TYPES[button.type].click(this) : '',
            icon: button.icon ? button.icon : false
        }))
    }

    open() {
        if (this.dialogEl) {
            return
        }
        if (this.fullScreen) {
            this.height = "85vh"
        }

        document.body.insertAdjacentHTML(
            'beforeend',
            dialogTemplate({
                id: this.id,
                classes: this.classes,
                title: this.title,
                height: this.height,
                width: this.width,
                icon: this.icon,
                buttons: this.buttons,
                zIndex: this.getHighestDialogZIndex() + 2,
                body: this.body,
                scroll: this.scroll,
                canClose: this.canClose,
                help: this.help,
                note: this.note
            })
        )
        this.backdropEl = document.body.lastElementChild
        this.dialogEl = this.backdropEl.previousElementSibling
        if (this.fullScreen) {
            this.dialogEl.style.width = '98%'
            this.dialogEl.style.height = '100%'
            this.dialogEl.style.position = 'fixed'
            this.dialogEl.style.top = "0px"
        } else {
            this.centerDialog()
        }
        this.bind()
    }

    refreshButtons() {
        this.dialogEl.querySelector('.ui-dialog-buttonset').innerHTML = buttonsTemplate({buttons: this.buttons})
    }

    refreshNote() {
        this.dialogEl.querySelector(".note-container").innerHTML = noteTemplate(this.note)
    }

    centerDialog() {
        const totalWidth = window.innerWidth,
            totalHeight = window.innerHeight,
            dialogWidth = this.dialogEl.clientWidth,
            dialogHeight = this.dialogEl.clientHeight,
            scrollTopOffset = window.pageYOffset,
            scrollLeftOffset = window.pageXOffset

        this.dialogEl.style.top = `${(totalHeight - dialogHeight) / 2 + scrollTopOffset}px`
        this.dialogEl.style.left = `${(totalWidth - dialogWidth) / 2 + scrollLeftOffset}px`
    }

    adjustDialogToScroll() {
        this.dialogEl.style.top = `${
            Math.max(
                Math.min(
                    this.dialogEl.offsetTop,
                    this.backdropEl.scrollHeight - this.dialogEl.scrollHeight + window.pageYOffset
                ),
                window.pageYOffset
            )
        }px`
    }

    moveDialog(x, y) {
        this.dialogEl.style.top = `${
            Math.min(
                Math.max(y - this.dragging.y, 0),
                this.backdropEl.scrollHeight - this.dialogEl.scrollHeight + window.pageYOffset
            )
        }px`
        this.dialogEl.style.left = `${
            Math.min(
                Math.max(x - this.dragging.x, 0),
                document.body.scrollWidth - this.dialogEl.scrollWidth
            )
        }px`
        this.hasBeenMoved = true
    }

    onScroll(_event) {
        if (this.hasBeenMoved) {
            // The dialog has been moved manually. We just adjust the position to make it stay in the view.
            this.adjustDialogToScroll()
        } else {
            this.centerDialog()
        }
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
        if (name === 'Escape' && this.canEscape) {
            this.close()
        }
    }

    bind() {
        this.listeners.onKeydown = event => this.onKeydown(event)
        document.body.addEventListener('keydown', this.listeners.onKeydown)
        this.dialogEl.addEventListener('click', event => {
            const el = {}
            switch (true) {
            case findTarget(event, '.ui-dialog-buttonpane button', el): {
                event.preventDefault()
                let buttonNumber = 0
                let seekItem = el.target
                while (seekItem.previousElementSibling) {
                    buttonNumber++
                    seekItem = seekItem.previousElementSibling
                }
                this.buttons[buttonNumber].click()
                break
            }
            case findTarget(event, '.ui-dialog-titlebar-close', el):
                event.preventDefault()
                this.close()
                break
            case findTarget(event, '.ui-dialog-titlebar-help', el):
                event.preventDefault()
                this.help()
                break
            default:
                break
            }
        })
        if (!this.fullScreen) {
            this.listeners.onScroll = event => this.onScroll(event)
            window.addEventListener('scroll', this.listeners.onScroll, false)
            this.dialogEl.addEventListener('mousedown', event => {
                const el = {}
                switch (true) {
                case findTarget(event, '.ui-dialog-titlebar', el):
                    this.dragging = {
                        x: event.clientX - this.dialogEl.offsetLeft,
                        y: event.clientY - this.dialogEl.offsetTop
                    }
                    break
                default:
                    break
                }
            })
            this.dialogEl.addEventListener('mouseup', event => {
                const el = {}
                switch (true) {
                case findTarget(event, '.ui-dialog-titlebar', el):
                    this.dragging = false
                    break
                default:
                    break
                }
            })
            this.dialogEl.addEventListener('mousemove', event => {
                if (!this.dragging) {
                    return
                }
                this.moveDialog(event.clientX, event.clientY)
            })
        }

    }

    getHighestDialogZIndex() {
        let zIndex = 100
        document.querySelectorAll('div.ui-dialog').forEach(dialogEl => zIndex = Math.max(zIndex, dialogEl.style.zIndex))
        return zIndex
    }

    close() {
        if (!this.dialogEl) {
            return
        }
        if (!this.fullScreen) {
            window.removeEventListener("scroll",  this.listeners.onScroll, false)
        }
        document.body.removeEventListener("keydown", this.listeners.onKeydown)
        if (this.beforeClose) {
            this.beforeClose()
        }
        this.dialogEl.parentElement.removeChild(this.dialogEl)
        this.backdropEl.parentElement.removeChild(this.backdropEl)
        if (this.onClose) {
            this.onClose()
        }
    }
}
