import {DataTable} from "simple-datatables"
import {ImageOverviewCategories} from "./categories"
import {
    activateWait,
    deactivateWait,
    addAlert,
    post,
    findTarget,
    whenReady,
    Dialog,
    localizeDate,
    escapeText,
    OverviewMenuView,
    baseBodyTemplate,
    setDocTitle,
    ensureCSS,
    DatatableBulk
} from "../../common"
import {SiteMenu} from "../../menu"
import {FeedbackTab} from "../../feedback"
import {menuModel, bulkModel} from "./menu"
import * as plugins from "../../../plugins/images_overview"
 /** Helper functions for user added images/SVGs.*/

export class ImageOverview {
    constructor({app, staticUrl, user}) {
        this.app = app
        this.staticUrl = staticUrl
        this.user = user
        this.mod = {}
    }

    init() {
        ensureCSS([
            'dialog_usermedia.css'
        ], this.staticUrl)

        whenReady().then(() => {
            this.render()
            new ImageOverviewCategories(this)
            const smenu = new SiteMenu("images")
            smenu.init()
            this.menu = new OverviewMenuView(this, menuModel)
            this.menu.init()
            this.activatePlugins()
            this.bindEvents()
            this.mod.categories.setImageCategoryList(this.app.imageDB.cats)
            this.initTable(Object.keys(this.app.imageDB.db))
        })
    }

    render() {
        document.body = document.createElement('body')
        document.body.innerHTML = baseBodyTemplate({
            contents: '',
            user: this.user,
            staticUrl: this.staticUrl,
            hasOverview: true
        })
        ensureCSS([
            'cropper.min.css'
        ], this.staticUrl)
        setDocTitle(gettext('Media Manager'), this.app)
        const feedbackTab = new FeedbackTab({staticUrl: this.staticUrl})
        feedbackTab.init()
    }

    activatePlugins() {
        // Add plugins
        this.plugins = {}

        Object.keys(plugins).forEach(plugin => {
            if (typeof plugins[plugin] === 'function') {
                this.plugins[plugin] = new plugins[plugin](this)
                this.plugins[plugin].init()
            }
        })
    }

    //delete image
    deleteImage(ids) {
        ids = ids.map(id => parseInt(id))

        activateWait()
        post(
            '/api/usermedia/delete/',
            {ids}
        ).catch(
            error => {
                addAlert('error', gettext('The image(s) could not be deleted'))
                throw (error)
            }
        ).then(
            () => {
                ids.forEach(id => {
                    delete this.app.imageDB[id]
                })
                this.removeTableRows(ids)
                addAlert('success', gettext('The image(s) have been deleted'))
            }
        ).then(
            () => deactivateWait()
        )
    }

    deleteImageDialog(ids) {

        const buttons = [
            {
                text: gettext('Delete'),
                classes: "fw-dark",
                click: () => {
                    this.deleteImage(ids)
                    dialog.close()
                }
            },
            {
                type: 'cancel'
            }
        ]
        const dialog = new Dialog({
            id: 'confirmdeletion',
            icon: 'exclamation-triangle',
            title: gettext('Confirm deletion'),
            body: `<p>${gettext('Delete the image(s)')}?</p>`,
            height: 180,
            buttons
        })
        dialog.open()
    }


    updateTable(ids) {
        // Remove items that already exist
        this.removeTableRows(ids)
        this.table.insert({data: ids.map(id => this.createTableRow(id))})
        // Redo last sort
        this.table.columns().sort(this.lastSort.column, this.lastSort.dir)
    }

    createTableRow(id) {
        const image = this.app.imageDB.db[id]
        const cats = image.cats.map(cat => `cat_${cat}`)

        let fileType = image.file_type.split('/')

        if (1 < fileType.length) {
            fileType = fileType[1].toUpperCase()
        } else {
            fileType = fileType[0].toUpperCase()
        }

        return [
            String(id),
            `<input type="checkbox" class="entry-select fw-check" id="doc-img-${id}" data-id="${id}"><label for="doc-img-${id}"></label>`,
            `<span class="fw-usermedia-image ${cats.join(' ')}">
                <img src="${image.thumbnail ? image.thumbnail : image.image}">
            </span>
            <span class="fw-usermedia-title">
                <span class="edit-image fw-link-text fw-searchable" data-id="${id}">
                    ${image.title.length ? escapeText(image.title) : gettext('Untitled')}
                </span>
                <span class="fw-usermedia-type">${fileType}</span>
            </span>`,
            `<span>${image.width} x ${image.height}</span>`,
            `<span class="date">${localizeDate(image.added, 'sortable-date')}</span>`,
            `<span class="delete-image fw-link-text" data-id="${id}">
                <i class="fa fa-trash-alt"></i>
            </span>`
        ]
    }

    removeTableRows(ids) {
        ids = ids.map(id => parseInt(id))

        const existingRows = this.table.data.map((data, index) => {
            const id = parseInt(data.cells[0].textContent)
            if (ids.includes(id)) {
                return index
            } else {
                return false
            }
        }).filter(rowIndex => rowIndex !== false)

        if (existingRows.length) {
            this.table.rows().remove(existingRows)
        }
    }

    /* Initialize the overview table */
    initTable(ids) {
        const tableEl = document.createElement('table')
        tableEl.id = "imagelist"
        tableEl.classList.add('fw-data-table')
        tableEl.classList.add('fw-large')
        document.querySelector('.fw-contents').appendChild(tableEl)

        const dt_bulk = new DatatableBulk(this, bulkModel)

        this.table = new DataTable(tableEl, {
            searchable: true,
            paging: false,
            scrollY: "calc(100vh - 240px)",
            labels: {
                noRows: gettext("No images available") // Message shown when there are no search results
            },
            layout: {
                top: ""
            },
            data: {
                headings: ['', dt_bulk.getHTML(), gettext("File"), gettext("Size (px)"), gettext("Added"), ''],
                data: ids.map(id => this.createTableRow(id))
            },
            columns: [
                {
                    select: 0,
                    hidden: true
                },
                {
                    select: [1, 3, 5],
                    sortable: false
                }
            ]
        })
        this.lastSort = {column: 0, dir: 'asc'}

        this.table.on('datatable.sort', (column, dir) => {
            this.lastSort = {column, dir}
        })

        dt_bulk.init(this.table.table)
    }

    // get IDs of selected bib entries
    getSelected() {
        return Array.from(
            document.querySelectorAll('.entry-select:checked:not(:disabled)')
        ).map(el => parseInt(el.getAttribute('data-id')))
    }

    bindEvents() {
        document.body.addEventListener('click', event => {
            const el = {}
            switch (true) {
                case findTarget(event, '.delete-image', el): {
                    const imageId = el.target.dataset.id
                    this.deleteImageDialog([imageId])
                    break
                }
                case findTarget(event, '.edit-image', el): {
                    const imageId = el.target.dataset.id
                    import("../edit_dialog").then(({ImageEditDialog}) => {
                        const dialog = new ImageEditDialog(this.app.imageDB, imageId)
                        dialog.init().then(
                            () => {
                                this.updateTable([imageId])
                            }
                        )
                    })
                    break
                }
                case findTarget(event, '.fw-add-input', el): {
                    const itemEl = el.target.closest('.fw-list-input')
                    if (!itemEl.nextElementSibling) {
                        itemEl.insertAdjacentHTML(
                            'afterend',
                            `<tr class="fw-list-input">
                                <td>
                                    <input type="text" class="category-form">
                                    <span class="fw-add-input icon-addremove"></span>
                                </td>
                            </tr>`
                        )
                    } else {
                        itemEl.parentElement.removeChild(itemEl)
                    }
                    break
                }
                default:
                    break
            }
        })
    }

}
