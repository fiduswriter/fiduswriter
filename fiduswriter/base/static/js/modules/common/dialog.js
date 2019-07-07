import {findTarget} from "./basic"

const dialogTemplate = ({id, classes, title, height, width, icon, buttons, zIndex, body, scroll}) =>
`<div tabindex="-1" role="dialog"
        class="ui-dialog ui-corner-all ui-widget ui-widget-content ui-front ui-dialog-buttons"
        ${id ? `aria-describedby="${id}"` : ''} style="z-index: ${zIndex};">
    <div class="ui-dialog-titlebar ui-corner-all ui-widget-header ui-helper-clearfix">
        ${icon ? `<i class="fa fa-${icon}" aria-hidden="true"></i>` : ''}
        <span id="ui-id-2" class="ui-dialog-title">${title}</span>
        <button type="button" class="ui-button ui-corner-all ui-widget ui-button-icon-only ui-dialog-titlebar-close" title="${gettext('Close')}">
            <span class="ui-button-icon ui-icon ui-icon-closethick"> </span>
            <span class="ui-button-icon-space"> </span>
            ${gettext('Close')}
        </button>
    </div>
    <div ${id ? `id="${id}"` : ''} class="ui-dialog-content ui-widget-content${classes ? ` ${classes}` : ''}${scroll ? ` ui-scrollable` : ''}" style="width: ${width}; height: ${height};">
        ${body}
    </div>
    <div class="ui-dialog-buttonpane ui-widget-content ui-helper-clearfix">
        <div class="ui-dialog-buttonset">${buttonsTemplate({buttons})}</div>
    </div>
</div>
<div class="ui-widget-overlay ui-front" style="z-index: ${zIndex-1}"></div>`

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
        this.eventAddress = this.scrollevent.bind(this)
        this.id = options.id || false
        this.classes = options.classes || false
        this.title = options.title || ''
        this.body = options.body || ''
        this.height = options.height ? `${options.height}px` : 'auto'
        this.width = options.width ? `${options.width}px` : 'auto'
        this.buttons = []
        if (options.buttons) {
            this.setButtons(options.buttons)
        }
        this.beforeClose = options.onClose || false
        this.onClose = options.onClose || false
        this.icon = options.icon || false
        this.scroll = options.scroll || false
        this.dialogEl = false
        this.backdropEl = false
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
        document.body.insertAdjacentHTML(
            'beforeend',
            dialogTemplate({
                id: this.id,
                classes: this.classes,
                title: this.title,
                height: this.height,
                width: this.width,
                icon: this.icon,
                buttons : this.buttons,
                zIndex: this.getHighestDialogZIndex() + 2,
                body: this.body,
                scroll: this.scroll
            })
        )
        this.backdropEl = document.body.lastElementChild
        this.dialogEl = this.backdropEl.previousElementSibling
        this.centerDialog()
        this.bind()
    }

    refreshButtons() {
        this.dialogEl.querySelector('.ui-dialog-buttonset').innerHTML = buttonsTemplate({buttons: this.buttons})
    }

    centerDialog() {
        const totalWidth = window.innerWidth,
            totalHeight = window.innerHeight,
            dialogWidth = this.dialogEl.clientWidth,
            dialogHeight = this.dialogEl.clientHeight,
            scrollTopOffset = window.pageYOffset,
            scrollLeftOffset = window.pageXOffset

        this.dialogEl.style.top = `${(totalHeight - dialogHeight)/2 + scrollTopOffset}px`
        this.dialogEl.style.left = `${(totalWidth - dialogWidth)/2 + scrollLeftOffset}px`
    }

    scrollevent() {
        this.centerDialog()
    }

    bind() {
        window.addEventListener('scroll', this.eventAddress, false)
        this.dialogEl.addEventListener('click', event => {
            const el = {}
            let buttonNumber, seekItem
            switch (true) {
                case findTarget(event, '.ui-dialog-buttonpane button', el):
                    event.preventDefault()
                    buttonNumber = 0
                    seekItem = el.target
                    while (seekItem.previousElementSibling) {
                        buttonNumber++
                        seekItem = seekItem.previousElementSibling
                    }
                    this.buttons[buttonNumber].click()
                    break
                case findTarget(event, '.ui-dialog-titlebar-close', el):
                    event.preventDefault()
                    this.close()
                    break
                default:
                    break
            }
        })
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
        window.removeEventListener("scroll",  this.eventAddress, false)
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
