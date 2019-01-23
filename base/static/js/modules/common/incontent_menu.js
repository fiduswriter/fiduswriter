
const dialogTemplate = ({id, classes, height, width, zIndex, body, scroll}) =>
`<div tabindex="-1" role="incontent_menu"
        class="ui-content_menu ui-corner-all ui-widget ui-widget-content ui-front"
        ${id ? `aria-describedby="${id}"` : ''} style="z-index: ${zIndex};">
    <div ${id ? `id="${id}"` : ''} class="ui-content_menu-content ui-widget-content${classes ? ` ${classes}` : ''}${scroll ? ` ui-scrollable` : ''}" style="width: ${width}; height: ${height};">
        ${body}
    </div>
</div>
<div class="ui-widget-overlay ui-front" style="z-index: ${zIndex-1}"></div>`

export class ContentMenu {
    constructor(options) {
        this.id = options.id || false
        this.classes = options.classes || false
        this.body = options.body || ''
        this.height = options.height ? `${options.height}px` : 'auto'
        this.width = options.width ? `${options.width}px` : 'auto'
        this.onClose = options.onClose || false
        this.scroll = options.scroll || false
        this.dialogEl = false
        this.backdropEl = false
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
                height: this.height,
                width: this.width,
                zIndex: this.getHighestDialogZIndex() + 2,
                body: this.body,
                scroll: this.scroll
            })
        )
        this.backdropEl = document.body.lastElementChild
        this.dialogEl = this.backdropEl.previousElementSibling
        this.positionDialog()
        this.bind()
    }

    positionDialog() {
        const totalWidth = window.innerWidth,
            totalHeight = window.innerHeight,
            dialogWidth = this.dialogEl.clientWidth,
            dialogHeight = this.dialogEl.clientHeight,
            scrollTopOffset = window.pageYOffset,
            scrollLeftOffset = window.pageXOffset
        this.dialogEl.style.top = `${(totalHeight - dialogHeight)/1.4 + scrollTopOffset}px`
        this.dialogEl.style.left = `${(totalWidth - dialogWidth)/1.5 + scrollLeftOffset}px`
    }

    bind() {
        this.backdropEl.addEventListener('click',() => this.close())
    }

    getHighestDialogZIndex() {
        let zIndex = 100
        document.querySelectorAll('div.ui-content_menu').forEach(dialogEl => zIndex = Math.max(zIndex, dialogEl.style.zIndex))
        return zIndex
    }

    close() {
        if (!this.dialogEl) {
            return
        }
        this.dialogEl.parentElement.removeChild(this.dialogEl)
        this.backdropEl.parentElement.removeChild(this.backdropEl)
        if (this.onClose) {
            this.onClose()
        }
    }
}
