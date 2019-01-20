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
    setDocTitle
} from "../../common"
import {SiteMenu} from "../../menu"
import {FeedbackTab} from "../../feedback"
import {menuModel} from "./menu"
import {ImageEditDialog} from "../edit_dialog"
import * as plugins from "../../../plugins/images_overview"
 /** Helper functions for user added images/SVGs.*/

export class ImageOverview {
    constructor({app, staticUrl, user}) {
        this.app = app
        this.staticUrl = staticUrl
        this.username = user.username
        this.mod = {}
    }

    init() {
        whenReady().then(() => {
            this.render()
            new ImageOverviewCategories(this)
            let smenu = new SiteMenu("images")
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
            contents: '<ul id="fw-overview-menu"></ul>',
            username: this.username,
            staticUrl: this.staticUrl
        })
        setDocTitle(gettext('Media Manager'))
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
            '/usermedia/delete/',
            {ids}
        ).catch(
            error => {
                addAlert('error', gettext('The image(s) could not be deleted'))
                throw(error)
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
        let image = this.app.imageDB.db[id]
        let fileType = image.file_type.split('/')

        if(1 < fileType.length) {
            fileType = fileType[1].toUpperCase()
        } else {
            fileType = fileType[0].toUpperCase()
        }
        return [
            String(id),
            `<input type="checkbox" class="entry-select" data-id="${id}">`,
            `<span class="fw-usermedia-image">
                <img src="${image.thumbnail ? image.thumbnail : image.image}">
            </span>
            <span class="fw-inline fw-usermedia-title">
                <span class="edit-image fw-link-text fw-searchable" data-id="${id}">
                    ${image.title.length ? escapeText(image.title) : gettext('Untitled')}
                </span>
                <span class="fw-usermedia-type">${fileType}</span>
            </span>`,
            `<span class="fw-inline">${image.width} x ${image.height}</span>`,
            `<span class="date">${localizeDate(image.added, 'sortable-date')}</span>`,
            `<span class="delete-image fw-inline fw-link-text" data-id="${id}">
                <i class="fa fa-trash-alt"></i>
            </span>`
        ]
    }

    removeTableRows(ids) {
        let existingRows = this.table.data.map((data, index) => {
            let id = parseInt(data.cells[0].textContent)
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
        let tableEl = document.createElement('table')
        tableEl.classList.add('fw-document-table')
        tableEl.classList.add('fw-large')
        document.querySelector('.fw-contents').appendChild(tableEl)
        this.table = new DataTable(tableEl, {
            searchable: true,
            paging: false,
            scrollY: "calc(100vh - 220px)",
            labels: {
                noRows: gettext("No images available") // Message shown when there are no search results
            },
            layout: {
                top: ""
            },
            data: {
                headings: ['','&emsp;&emsp;', gettext("File"), gettext("Size (px)"), gettext("Added"), ''],
                data: ids.map(id => this.createTableRow(id))
            },
            columns: [
                {
                    select: 0,
                    hidden: true
                },
                {
                    select: [1,3,5],
                    sortable: false
                }
            ]
        })
        this.lastSort = {column: 0, dir: 'asc'}

        this.table.on('datatable.sort', (column, dir) => {
            this.lastSort = {column, dir}
        })
    }

    // get IDs of selected bib entries
    getSelected() {
        return Array.from(
            document.querySelectorAll('.entry-select:checked:not(:disabled)')
        ).map(el => parseInt(el.getAttribute('data-id')))
    }

    bindEvents() {
        document.body.addEventListener('click', event => {
            let el = {}, imageId, itemEl, dialog
            switch (true) {
                case findTarget(event, '.delete-image', el):
                    imageId = el.target.dataset.id
                    this.deleteImageDialog([imageId])
                    break
                case findTarget(event, '.edit-image', el):
                    imageId = el.target.dataset.id
                    dialog = new ImageEditDialog(this.imageDB, imageId)
                    dialog.init().then(
                        imageId => {
                            this.updateTable([imageId])
                        }
                    )
                    break
                case findTarget(event, '.fw-add-input', el):
                    itemEl = el.target.closest('.fw-list-input')
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
                default:
                    break
            }
        })
    }

}
