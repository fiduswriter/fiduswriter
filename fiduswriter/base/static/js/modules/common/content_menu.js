
const menuTemplate = ({id, classes, height, width, zIndex, menu, scroll, page}) =>
`<div tabindex="-1" role="incontent_menu"
        class="ui-content_menu ui-corner-all ui-widget ui-widget-content ui-front"
        ${id ? `aria-describedby="${id}"` : ''} style="z-index: ${zIndex};">
    <div ${id ? `id="${id}"` : ''} class="ui-content_menu-content ui-widget-content${classes ? ` ${classes}` : ''}${scroll ? ` ui-scrollable` : ''}" style="width: ${width}; height: ${height};">
    <div>
        <ul class="content-menu-list">
        ${
            menu.content.map((menuItem, index)=>
                menuItem.type == "separator" ?
                    '<hr class="content-menu-item-divider"/>' :
                    `<li data-index="${index}" class="content-menu-item${
                        menuItem.disabled && menuItem.disabled(page) ?
                        ' disabled' :
                        ''
                    }" title='${menuItem.tooltip}'>
                    ${
                        typeof menuItem.title === 'function' ?
                            menuItem.title(page) :
                            menuItem.title
                    } ${
                        menuItem.icon ?
                            `<span class="content-menu-item-icon"><i class="fa fa-${menuItem.icon}"></i></span>` :
                            ''
                    }
                    </li>`
            ).join('')
        }
        </ul>
    </div>
    </div>
</div>
<div class="ui-widget-overlay ui-front" style="z-index: ${zIndex-1}"></div>`

export class ContentMenu {
    constructor({
        id = false,
        page = false,
        classes = false,
        menu = {content: []},
        height = false,
        width = false,
        onClose = false,
        scroll = false,
        dialogEl = false,
        backdropEl = false,
        menuPos = false
    }) {
        this.id = id
        this.page = page
        this.classes = classes
        this.menu = menu
        this.height = height ? `${height}px` : 'auto'
        this.width = width ? `${width}px` : 'auto'
        this.onClose = onClose
        this.scroll = scroll
        this.dialogEl = dialogEl
        this.backdropEl = backdropEl
        this.menuPos = menuPos
    }

    open() {
        if (this.dialogEl) {
            return
        }
        document.body.insertAdjacentHTML(
            'beforeend',
            menuTemplate({
                id: this.id,
                classes: this.classes,
                height: this.height,
                width: this.width,
                zIndex: this.getHighestDialogZIndex() + 2,
                menu: this.menu,
                scroll: this.scroll,
                page: this.page
            })
        )
        this.backdropEl = document.body.lastElementChild
        this.dialogEl = this.backdropEl.previousElementSibling
        if (this.menuPos && this.menuPos.X && this.menuPos.Y)
            this.positionDialog()
        else
            this.centerDialog()
        this.bind()
    }

    centerDialog() {
        const totalWidth = window.innerWidth,
            totalHeight = window.innerHeight,
            dialogRect = this.dialogEl.getBoundingClientRect(),
            dialogWidth = dialogRect.width + 10,
            dialogHeight = dialogRect.height + 10,
            scrollTopOffset = window.pageYOffset,
            scrollLeftOffset = window.pageXOffset
        this.dialogEl.style.top = `${(totalHeight - dialogHeight)/2 + scrollTopOffset}px`
        this.dialogEl.style.left = `${(totalWidth - dialogWidth)/2 + scrollLeftOffset}px`
    }

    positionDialog() {
        const dialogHeight = this.dialogEl.getBoundingClientRect().height + 10,
            scrollTopOffset = window.pageYOffset,
            clientHeight = window.document.documentElement.clientHeight,
            left = this.menuPos.X
        // We try to ensure that the menu is seen in the browser at the preferred location.
        // Adjustments are made in case it doesn't fit.
        let top = this.menuPos.Y

        if ((top + dialogHeight) > (scrollTopOffset + clientHeight)) {
            top -= ((top + dialogHeight) - (scrollTopOffset + clientHeight))
        }

        if (top < scrollTopOffset) {
            top = scrollTopOffset + 10
        }

        this.dialogEl.style.top = `${top}px`
        this.dialogEl.style.left = `${left}px`
    }

    bind() {
        this.backdropEl.addEventListener('click', () => this.close())
        this.dialogEl.addEventListener('click', event => this.onclick(event))
    }

    getHighestDialogZIndex() {
        let zIndex = 100
        document.querySelectorAll('div.ui-content_menu').forEach(dialogEl => zIndex = Math.max(zIndex, dialogEl.style.zIndex))
        document.querySelectorAll('div.ui-dialog').forEach(dialogEl => zIndex = Math.max(zIndex, dialogEl.style.zIndex))
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

    onclick(event) {
        event.preventDefault()
        event.stopImmediatePropagation()
        const target = event.target
        if (target.matches('li.content-menu-item')) {
            const menuNumber = target.dataset.index
            const menuItem = this.menu.content[menuNumber]
            if (menuItem.disabled && menuItem.disabled(this.page)) {
                return
            }
            menuItem.action(this.page)
            this.close()
        }
    }
}
