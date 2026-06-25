import {Dialog, SelectionDataTable, cancelPromise, escapeText} from "fwtoolkit"

export class ImageSelectionDialog {
    constructor(imageDB, userImageDB, imgId, page) {
        this.imageDB = imageDB
        this.userImageDB = userImageDB
        this.page = page
        this.imgId = imgId // a preselected image
        this.imgDb = "document" // the preselection image will always come from the document
        this.images = [] // images from both databases
    }

    isE2EE() {
        return this.page.e2ee?.encrypted === true
    }

    init() {
        this.images = Object.values(this.imageDB.db).map(image => {
            return {
                image,
                db: "document"
            }
        })
        Object.values(this.userImageDB.db).forEach(image => {
            if (this.imageDB.db[image.id]) {
                return
            }
            this.images.push({
                image,
                db: "user"
            })
        })
        const buttons = []
        const p = new Promise(resolve => {
            if (!this.page.app.isOffline()) {
                buttons.push({
                    text: gettext("Add new image"),
                    icon: "plus-circle",
                    click: () => {
                        import("../edit_dialog").then(({ImageEditDialog}) => {
                            const targetDB = this.isE2EE()
                                ? this.imageDB
                                : this.userImageDB
                            const imageUpload = new ImageEditDialog(
                                targetDB,
                                false,
                                this.page
                            )

                            resolve(
                                imageUpload.init().then(imageId => {
                                    this.imgId = imageId
                                    // For E2EE docs the image goes straight
                                    // into the document DB, not the user's.
                                    this.imgDb = this.isE2EE()
                                        ? "document"
                                        : "user"
                                    this.imageDialog.close()
                                    return this.init()
                                })
                            )
                        })
                    }
                })
            }

            buttons.push({
                text: gettext("Use image"),
                classes: "fw-dark",
                click: () => {
                    this.imageDialog.close()
                    resolve({id: this.imgId, db: this.imgDb})
                }
            })

            buttons.push({
                type: "cancel",
                click: () => {
                    this.imageDialog.close()
                    resolve(cancelPromise())
                }
            })
        })
        this.imageDialog = new Dialog({
            buttons,
            width: 300,
            body: '<div class="image-selection-table"></div>',
            title: gettext("Images"),
            id: "select-image-dialog"
        })
        this.imageDialog.open()
        this.initTable()
        this.imageDialog.centerDialog()
        return p
    }

    initTable() {
        /* Initialize the overview table */
        const tableEl = document.createElement("table")
        tableEl.classList.add("fw-data-table")
        tableEl.classList.add("fw-small")
        const host = this.imageDialog.dialogEl.querySelector(
            "div.image-selection-table"
        )
        host.innerHTML = ""
        host.appendChild(tableEl)

        const selectedIds =
            this.imgId === false ? [] : [`${this.imgDb}-${this.imgId}`]

        this.selectionTable = new SelectionDataTable({
            dom: host,
            classes: ["fw-data-table", "fw-small"],
            columns: [
                {
                    select: 0,
                    hidden: true
                },
                {
                    select: [0, 2],
                    type: "string"
                },
                {
                    select: [1, 3],
                    sortable: false
                }
            ],
            data: this.images.map(image => this.createTableRow(image)),
            idColumn: 0,
            multiple: false,
            selectedIds,
            scrollY: "270px",
            labels: {
                noRows: gettext("No images available"), // Message shown when there are no images
                noResults: gettext("No images found"), // Message shown when no images are found after search
                placeholder: gettext("Search...") // placeholder for search field
            },
            onChange: selected => {
                if (selected.length) {
                    const [db, id] = String(selected[0]).split("-")
                    this.imgId = Number.parseInt(id)
                    this.imgDb = db
                } else {
                    this.imgId = false
                }
            }
        })
        this.selectionTable.init()
        this.table = this.selectionTable.table
    }

    createTableRow(image) {
        return [
            `${image.db}-${image.image.id}`,
            image.image.thumbnail === undefined
                ? `<img src="${image.image.image}" style="max-heigth:30px;max-width:30px;">`
                : `<img src="${image.image.thumbnail}" style="max-heigth:30px;max-width:30px;">`,
            escapeText(image.image.title)
        ]
    }
}
