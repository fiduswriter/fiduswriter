import {DataTable} from "simple-datatables"

import {ImageDB} from "../database"
import {ImageOverviewCategories} from "./categories"
import {activateWait, deactivateWait, addAlert, post, findTarget, whenReady, Dialog, localizeDate, escapeText} from "../../common"
import {SiteMenu} from "../../menu"
import {OverviewMenuView} from "../../common"
import {menuModel} from "./menu"
import {ImageEditDialog} from "../edit_dialog"
import * as plugins from "../../../plugins/images_overview"
 /** Helper functions for user added images/SVGs.*/

export class ImageOverview {
    constructor() {
        this.mod = {}
        new ImageOverviewCategories(this)
        let smenu = new SiteMenu("images")
        smenu.init()
        this.menu = new OverviewMenuView(this, menuModel)
        this.menu.init()
        this.bind()
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
                    delete this.imageDB[id]
                })
                this.removeTableRows(ids)
                addAlert('success', gettext('The image(s) have been deleted'))
            }
        ).then(
            () => deactivateWait()
        )
    }

    deleteImageDialog(ids) {

        let buttons = [
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
        let dialog = new Dialog({
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
        let image = this.imageDB.db[id]
        let fileType = image.file_type.split('/')

        if(1 < fileType.length) {
            fileType = fileType[1].toUpperCase()
        } else {
            fileType = fileType[0].toUpperCase()
        }
        return [
            id,
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
                <i class="fa fa-trash-o"></i>
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

    getImageDB() {
        let imageGetter = new ImageDB()
        imageGetter.getDB().then(ids => {
            this.imageDB = imageGetter
            this.mod.categories.setImageCategoryList(imageGetter.cats)
            this.initTable(ids)
        })
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
            scrollY: "calc(100vh - 320px)",
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
        document.addEventListener('click', event => {
            let el = {}, imageId
            switch (true) {
                case findTarget(event, '.delete-image', el):
                    imageId = el.target.dataset.id
                    this.deleteImageDialog([imageId])
                    break
                case findTarget(event, '.edit-image', el):
                    imageId = el.target.dataset.id
                    let dialog = new ImageEditDialog(this.imageDB, imageId)
                    dialog.init().then(
                        imageId => {
                            this.updateTable([imageId])
                        }
                    )
                    break
                case findTarget(event, '.fw-add-input', el):
                    let itemEl = el.target.closest('.fw-list-input')
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

    init() {
        this.activatePlugins()
        this.bindEvents()
        this.getImageDB()
    }

    bind() {
        whenReady().then(() => {
            this.init()
        })
    }

}
