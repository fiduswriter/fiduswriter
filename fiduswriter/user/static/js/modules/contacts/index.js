import deepEqual from "fast-deep-equal"

import {baseBodyTemplate} from "@fiduswriter/common/common"
import {FeedbackTab} from "@fiduswriter/common/feedback"
import {SiteMenu} from "@fiduswriter/common/menu"
import {
    OverviewDataTable,
    OverviewMenuView,
    addAlert,
    avatarTemplate,
    escapeText,
    findTarget,
    postJson,
    setDocTitle,
    whenReady
} from "fwtoolkit"
import {DeleteContactDialog} from "./delete_dialog"
import {bulkMenuModel, menuModel} from "./menu"
import {RespondInviteDialog} from "./respond_invite"
import {
    deleteContactCell,
    displayContactType,
    respondInviteCell
} from "./templates"

export class ContactsOverview {
    constructor({app, user}) {
        this.app = app
        this.user = user

        this.contacts = []
        this.lastSort = {column: 0, dir: "asc"}
    }

    init() {
        return whenReady().then(() => {
            this.render()
            const smenu = new SiteMenu(this.app, "") // Nothing highlighted.
            smenu.init()
            this.menu = new OverviewMenuView(this, menuModel)
            this.menu.init()
            this.bind()
            this.getList()
        })
    }

    render() {
        this.dom = document.createElement("body")
        this.dom.innerHTML = baseBodyTemplate({
            contents: "",
            user: this.user,
            hasOverview: true,
            app: this.app
        })
        document.body = this.dom
        setDocTitle(gettext("Contacts"), this.app)
        const feedbackTab = new FeedbackTab()
        feedbackTab.init()
    }

    /* Initialize the overview table */
    initTable(searching = false) {
        if (this.overviewTable) {
            this.overviewTable.destroy()
            this.overviewTable = null
        }
        this.table = null
        this.dtBulk = null

        const contentsEl = document.querySelector(".fw-contents")
        contentsEl.innerHTML = "" // Delete any old table

        this.overviewTable = new OverviewDataTable({
            dom: contentsEl,
            classes: ["fw-data-table", "fw-large", "contacts-table"],
            columns: [
                {
                    select: 0,
                    hidden: true,
                    type: "number"
                },
                {
                    select: 1,
                    hidden: true,
                    type: "string"
                },
                {
                    select: 2,
                    type: "boolean"
                },
                {
                    select: [2, 6],
                    sortable: false
                },
                {
                    select: [this.lastSort.column],
                    sort: this.lastSort.dir
                }
            ],
            data: this.contacts.map(contact => this.createTableRow(contact)),
            idColumn: 0,
            checkboxColumn: 2,
            bulkMenu: bulkMenuModel(),
            bulkMenuPage: this,
            searchable: searching,
            scrollY: `${Math.max(window.innerHeight - 360, 100)}px`,
            tabIndex: 1,
            labels: {
                noRows: gettext("No contacts available"),
                noResults: gettext("No contacts found") // Message shown when there are no search results
            },
            headings: [
                "",
                "",
                "",
                gettext("Name"),
                gettext("Type"),
                gettext("Email address"),
                ""
            ],
            template: (options, _dom) =>
                `<div class='${options.classes.container}'style='height: ${options.scrollY}; overflow-Y: auto;'></div>`,
            rowRender: (row, tr, _index) => {
                const id = row.cells[0].data
                const contactType = row.cells[1].data
                const inputNode = {
                    nodeName: "input",
                    attributes: {
                        type: "checkbox",
                        class: `entry-select fw-check ${contactType}`,
                        "data-id": id,
                        "data-type": contactType,
                        id: `contact-${contactType}-${id}`
                    }
                }
                if (row.cells[2].data) {
                    inputNode.attributes.checked = true
                }
                tr.childNodes[0].childNodes = [
                    inputNode,
                    {
                        nodeName: "label",
                        attributes: {
                            for: `contact-${contactType}-${id}`
                        }
                    }
                ]
            },
            onDelete: row => {
                const id = row.cells[0].data
                const type = row.cells[1].data
                this.deleteContact(id, type)
            }
        })
        this.overviewTable.init()
        this.table = this.overviewTable.table
        this.dtBulk = this.overviewTable.dtBulk

        this.table.on("datatable.sort", (column, dir) => {
            this.lastSort = {column, dir}
        })

        this.table.dom.focus()
    }

    createTableRow(contact) {
        return [
            contact.id,
            contact.type,
            false, // checkbox
            `${avatarTemplate({user: contact})} ${escapeText(contact.name)}`,
            displayContactType(contact),
            contact.email,
            contact.type === "to_userinvite"
                ? respondInviteCell(contact)
                : deleteContactCell(contact)
        ]
    }

    getList() {
        const cachedPromise = this.showCached()
        if (this.app.isOffline()) {
            return cachedPromise
        }
        return postJson("/api/user/contacts/list/")
            .then(({json}) => {
                return cachedPromise.then(oldJson => {
                    if (!deepEqual(json, oldJson)) {
                        this.updateIndexedDB(json)
                        this.loadData(json)
                        this.initializeView()
                    }
                })
            })
            .catch(error => {
                if (!this.app.isOffline()) {
                    addAlert("error", gettext("Could not obtain contacts list"))
                    throw error
                }
            })
    }

    loadData(json) {
        this.contacts = json.contacts
    }

    initializeView() {
        if (this.app.page === this) {
            this.initTable()
            // Reset scroll position to top to prevent Safari from auto-scrolling
            // to the focused table element, which would hide the header/menu
            window.scrollTo(0, 0)
        }
    }

    showCached() {
        return this.loaddatafromIndexedDB().then(json => {
            if (!json) {
                return Promise.resolve(false)
            }
            this.loadData(json)
            this.initializeView(json)
            return json
        })
    }

    loaddatafromIndexedDB() {
        return this.app.indexedDB.readAllData("user_data").then(response => {
            if (!response.length) {
                return false
            }
            const data = response[0]
            delete data.id
            return data
        })
    }

    updateIndexedDB(json) {
        json.id = 1
        // Clear data if any present
        return this.app.indexedDB
            .clearData("user_data")
            .then(() => this.app.indexedDB.insertData("user_data", [json]))
    }

    bind() {
        this.dom.addEventListener("click", event => {
            const el = {}
            switch (true) {
                case findTarget(event, ".delete-single-contact", el): {
                    //delete single user
                    const id = Number.parseInt(el.target.dataset.id)
                    const type = el.target.dataset.type

                    this.deleteContact(id, type)
                    break
                }
                case findTarget(event, ".respond-invite", el): {
                    const id = Number.parseInt(el.target.dataset.id)
                    const invite = this.contacts.find(
                        contact =>
                            contact.id === id &&
                            contact.type === "to_userinvite"
                    )
                    const dialog = new RespondInviteDialog(
                        [invite],
                        contacts =>
                            (this.contacts = this.contacts.concat(contacts)),
                        invites =>
                            (this.contacts = this.contacts.filter(
                                contact =>
                                    !invites.find(
                                        invite =>
                                            invite.type === contact.type &&
                                            invite.id === contact.id
                                    )
                            )),
                        () => this.initializeView()
                    )
                    dialog.init()
                    break
                }
                default:
                    break
            }
        })
    }

    // get IDs of selected contacts
    getSelected() {
        return Array.from(
            this.dom.querySelectorAll(".entry-select:checked:not(:disabled)")
        ).map(el => ({
            id: Number.parseInt(el.dataset.id),
            type: el.dataset.type
        }))
    }

    deleteContact(id, type) {
        const dialog = new DeleteContactDialog([{id, type}])
        dialog.init().then(() => {
            this.contacts = this.contacts.filter(
                ocontact => ocontact.id !== id || ocontact.type !== type
            )
            this.initializeView()
        })
    }
}
