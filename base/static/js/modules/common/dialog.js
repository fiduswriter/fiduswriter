
let dialogTemplate = ({title, height, width, id, buttons, zIndex, body}) =>
`<div tabindex="-1" role="dialog"
        class="ui-dialog ui-corner-all ui-widget ui-widget-content ui-front ui-dialog-buttons"
        ${id ? `aria-describedby="${id}"` : ''} style="z-index: ${zIndex};">
    <div class="ui-dialog-titlebar ui-corner-all ui-widget-header ui-helper-clearfix">
        <span id="ui-id-2" class="ui-dialog-title">${title}</span>
        <button type="button" class="ui-button ui-corner-all ui-widget ui-button-icon-only ui-dialog-titlebar-close" title="${gettext('Close')}">
            <span class="ui-button-icon ui-icon ui-icon-closethick"> </span>
            <span class="ui-button-icon-space"> </span>
            ${gettext('Close')}
        </button>
    </div>
    <div ${id ? `id="${id}"` : ''} class="ui-dialog-content ui-widget-content" style="width: ${width}; height: ${height};">${body}</div>
    <div class="ui-dialog-buttonpane ui-widget-content ui-helper-clearfix">
        <div class="ui-dialog-buttonset">${
            buttons.map(button => buttonTemplate(button)).join('')
        }</div>
    </div>
</div>
<div class="ui-widget-overlay ui-front" style="z-index: ${zIndex-1}"></div>`

let buttonTemplate = ({text, classes}) => `<button type="button" class="${classes ? classes : 'fw-light'} fw-button ui-button ui-corner-all ui-widget">${text}</button>`

let BUTTON_TYPES = {
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
        this.id = options.id ? options.id : false
        this.title = options.title ? options.title : ''
        this.body = options.body ? options.body : ''
        this.height = options.heigth ? `${options.height}px` : 'auto'
        this.width = options.width ? `${options.width}px` : 'auto'
        this.buttons = options.buttons ? this.addDefaultButtons(options.buttons) : []
        this.dialogEl = false
        this.backdropEl = false
    }

    addDefaultButtons(buttons) {
        return buttons.map(button => ({
            text: button.text ? button.text : BUTTON_TYPES[button.type].text,
            classes: button.classes ? button.classes : BUTTON_TYPES[button.type].classes,
            click: button.click ? button.click : BUTTON_TYPES[button.type].click(this)
        }))
    }

    open() {
        if (this.dialogEl) {
            return
        }
        document.body.insertAdjacentHTML(
            'beforeend',
            dialogTemplate({
                title: this.title,
                height: this.height,
                width: this.width,
                id: this.id,
                buttons : this.buttons,
                zIndex: this.getHighestDialogZIndex() + 2,
                body: this.body
            })
        )
        this.backdropEl = document.body.lastElementChild
        this.dialogEl = this.backdropEl.previousElementSibling
        this.centerDialog()
        this.bind()
    }

    centerDialog() {
        let totalWidth = window.innerWidth,
            totalHeight = window.innerHeight,
            dialogWidth = this.dialogEl.clientWidth,
            dialogHeight = this.dialogEl.clientHeight

        this.dialogEl.style.top = `${(totalHeight - dialogHeight)/2}px`
        this.dialogEl.style.left = `${(totalWidth - dialogWidth)/2}px`
    }

    bind() {
        this.dialogEl.querySelectorAll('.ui-dialog-buttonpane button').forEach((buttonEl, index) => {
            buttonEl.addEventListener('click', () => this.buttons[index].click())
        })
        this.dialogEl.querySelector('.ui-dialog-titlebar-close').addEventListener('click', () => this.close())
    }

    getHighestDialogZIndex() {
        let zIndex = 100
        document.querySelectorAll('div.ui-dialog').forEach(dialogEl => zIndex = Math.max(zIndex, dialogEl.style.zIndex))
        return zIndex
    }

    close() {
        if (this.dialogEl) {
            this.dialogEl.parentElement.removeChild(this.dialogEl)
            this.backdropEl.parentElement.removeChild(this.backdropEl)
        }
    }
}
