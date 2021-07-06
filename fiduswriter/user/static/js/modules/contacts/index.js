import deepEqual from "fast-deep-equal"
import {DataTable} from "simple-datatables"
import {deleteContactCell, respondInviteCell, displayContactType} from "./templates"
import {DeleteContactDialog} from "./delete_dialog"
import {RespondInviteDialog} from "./respond_invite"
import {postJson, addAlert, OverviewMenuView, findTarget, whenReady, baseBodyTemplate, setDocTitle, DatatableBulk, escapeText} from "../common"
import {FeedbackTab} from "../feedback"
import {SiteMenu} from "../menu"
import {menuModel, bulkMenuModel} from "./menu"

export class ContactsOverview {
    constructor({app, user}) {
        this.app = app
        this.user = user

        this.contacts = []
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
        this.dtBulk = new DatatableBulk(this, bulkMenuModel())

        this.dom = document.createElement('body')
        this.dom.innerHTML = baseBodyTemplate({
            contents: '',
            user: this.user,
            hasOverview: true
        })
        document.body = this.dom
        setDocTitle(gettext('Contacts'), this.app)
        const feedbackTab = new FeedbackTab()
        feedbackTab.init()

    }

    /* Initialize the overview table */
    initTable() {
        if (this.table) {
            this.table.destroy()
            this.table = false
        }
        const tableEl = document.createElement('table')
        tableEl.classList.add('fw-data-table')
        tableEl.classList.add('fw-large')
        tableEl.classList.add('contacts-table')
        const contentsEl = document.querySelector('.fw-contents')
        contentsEl.innerHTML = '' // Delete any old table
        contentsEl.appendChild(tableEl)

        this.dtBulk = new DatatableBulk(this, bulkMenuModel())

        this.table = new DataTable(tableEl, {
            paging: false,
            scrollY: `${Math.max(window.innerHeight - 360, 100)}px`,
            labels: {
                noRows: gettext("No contacts available") // Message shown when there are no search results
            },
            layout: {
                top: "",
                bottom: ""
            },
            data: {
                headings: [
                    '',
                    '',
                    this.dtBulk.getHTML(),
                    gettext("Name"),
                    gettext("Type"),
                    gettext("Email address"),
                    '',
                ],
                data: this.contacts.map(contact => this.createTableRow(contact))
            },
            columns: [
                {
                    select: [0, 1],
                    hidden: true
                },
                {
                    select: [2, 6],
                    sortable: false
                },
            ],
        })

        this.dtBulk.init(this.table.table)
    }

    createTableRow(contact) {
        return [
            String(contact.id),
            contact.type,
            `<input type="checkbox" class="entry-select fw-check ${contact.type}" id="contact-${contact.type}-${contact.id}" data-id="${contact.id}" data-type="${contact.type}"><label for="contact-${contact.type}-${contact.id}"></label`,
            `${contact.avatar.html} ${escapeText(contact.name)}`,
            displayContactType(contact),
            contact.email,
            contact.type === 'to_userinvite' ? respondInviteCell(contact) : deleteContactCell(contact)
        ]
    }


    getList() {
        const cachedPromise = this.showCached()
        if (this.app.isOffline()) {
            return cachedPromise
        }
        return postJson('/api/user/contacts/list/').then(
            ({json}) => {
                return cachedPromise.then(oldJson => {
                    if (!deepEqual(json, oldJson)) {
                        this.updateIndexedDB(json)
                        this.loadData(json)
                        this.initializeView()
                    }
                })

            }
        ).catch(
            error => {
                if (!this.app.isOffline()) {
                    addAlert('error', gettext('Could not obtain contacts list'))
                    throw (error)
                }
            }
        )
    }

    loadData(json) {
        this.contacts = json.contacts
    }

    initializeView() {
        this.initTable()
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
        return this.app.indexedDB.readAllData("user_data").then(
            response => {
                if (!response.length) {
                    return false
                }
                const data = response[0]
                delete data.id
                return data
            }
        )

    }

    updateIndexedDB(json) {
        json.id = 1
        // Clear data if any present
        return this.app.indexedDB.clearData("user_data").then(
            () => this.app.indexedDB.insertData("user_data", [json])
        )
    }

    bind() {
        this.dom.addEventListener('click', event => {
            const el = {}
            switch (true) {
            case findTarget(event, '.delete-single-contact', el): {
                //delete single user
                const id = parseInt(el.target.dataset.id)
                const type = el.target.dataset.type
                const dialog = new DeleteContactDialog([{id, type}])
                dialog.init().then(() => {
                    this.contacts = this.contacts.filter(
                        ocontact => ocontact.id !== id || ocontact.type !== type
                    )
                    this.initializeView()
                })
                break
            }
            case findTarget(event, '.respond-invite', el): {
                const id = parseInt(el.target.dataset.id)
                const invite = this.contacts.find(contact => contact.id === id && contact.type === 'to_userinvite')
                const dialog = new RespondInviteDialog(
                    [invite],
                    contacts => this.contacts = this.contacts.concat(contacts),
                    invites => this.contacts = this.contacts.filter(
                        contact => !invites.find(
                            invite => invite.type === contact.type && invite.id === contact.id
                        )
                    ),
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
            this.dom.querySelectorAll('.entry-select:checked:not(:disabled)')
        ).map(el => ({id: parseInt(el.dataset.id), type: el.dataset.type}))
    }


}
