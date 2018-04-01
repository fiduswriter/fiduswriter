import DataTable from "vanilla-datatables"

import {ImageEditDialog} from "../edit_dialog"
import {cancelPromise, Dialog, escapeText, findTarget} from "../../common"

export class ImageSelectionDialog {
    constructor(imageDB, userImageDB, imgId) {
        this.imageDB = imageDB
        this.userImageDB = userImageDB
        this.imgId = imgId // a preselected image
        this.imgDb = 'document' // the preselection image will always come from the document
        this.images = [] // images from both databases
    }

    init() {
        this.images = Object.values(this.imageDB.db).map(image => {
            return {
                image,
                db: 'document'
            }
        })
        Object.values(this.userImageDB.db).forEach(image => {
            if (this.imageDB.db[image.id]) {
                return
            }
            this.images.push({
                image,
                db: 'user'
            })
        })
        let buttons = []
        let p = new Promise(resolve => {
            buttons.push(
                {
                    text: gettext('Add new image'),
                    icon: "plus-circle",
                    click: () => {
                        let imageUpload = new ImageEditDialog(
                            this.userImageDB // We can only upload to the user's image db
                        )

                        resolve(
                            imageUpload.init().then(
                                imageId => {
                                    this.imgId = imageId
                                    this.imgDb = 'user'
                                    this.imageDialog.close()
                                    return this.init()
                                }
                            )
                        )
                    }
                }
            )

            buttons.push(
                {
                    text: gettext('Use image'),
                    classes: "fw-dark",
                    click: () => {
                        this.imageDialog.close()
                        resolve({id: this.imgId, db: this.imgDb})
                    }
                }
            )

            buttons.push(
                {
                    type: 'cancel',
                    click: () => {
                        this.imageDialog.close()
                        resolve(cancelPromise())
                    }
                }
            )

        })
        this.imageDialog = new Dialog({
            buttons,
            width: 300,
            body: '<div class="image-selection-table"></div>',
            title: gettext("Images"),
            id: 'select-image-dialog'
        })
        this.imageDialog.open()
        this.initTable()
        this.imageDialog.centerDialog()
        this.bindEvents()
        return p
    }

    initTable() {
        /* Initialize the overview table */
        let tableEl = document.createElement('table')
        tableEl.classList.add('fw-document-table')
        tableEl.classList.add('fw-small')
        this.imageDialog.dialogEl.querySelector('div.image-selection-table').appendChild(tableEl)
        this.table = new DataTable(tableEl, {
            searchable: true,
            paging: false,
            scrollY: "270px",
            labels: {
                noRows: gettext("No images available"), // Message shown when there are no search results
                placeholder: gettext("Search...") // placeholder for search field
            },
            layout: {
                top: "{search}"
            },
            data: {
                headings: ["", gettext("Image"), gettext("Title"), ""],
                data: this.images.map(image => this.createTableRow(image))
            },
            columns: [
                {
                    select: 0,
                    hidden: true
                },
                {
                    select: [1, 3],
                    sortable: false
                }
            ]
        })
        this.lastSort = {column: 0, dir: 'asc'}

        this.table.on('datatable.sort', (column, dir) => {
            this.lastSort = {column, dir}
        })
    }

    createTableRow(image) {
        return [
            `${image.db}-${image.image.id}`,
            image.image.thumbnail === undefined ?
            `<img src="${image.image.image}" style="max-heigth:30px;max-width:30px;">` :
            `<img src="${image.image.thumbnail}" style="max-heigth:30px;max-width:30px;">`,
            escapeText(image.image.title),
            image.db === this.imgDb && image.image.id === this.imgId ?
            '<i class="fa fa-check" aria-hidden="true"></i>' :
            '&emsp;'
        ]
    }

    checkRow(dataIndex) {
        let [db, id] = this.table.data[dataIndex].cells[0].textContent.split('-')
        id = parseInt(id)
        if (id === this.imgId) {
            this.imgId = false
        } else {
            this.imgId = id
        }
        this.imgDb = db
        this.table.data.forEach((data, index) => {
            data.cells[3].innerHTML = index===dataIndex && this.imgId ? '<i class="fa fa-check" aria-hidden="true"></i>' : '&emsp;'
        })
        this.table.columns().rebuild()
    }

    bindEvents() {
        // functions for the image selection dialog
        this.table.body.addEventListener('click', event => {
            let el = {}, imageId
            switch (true) {
                case findTarget(event, 'tr', el):
                    this.checkRow(el.target.dataIndex)
                    break
                default:
                    break
            }
        })
    }
}
