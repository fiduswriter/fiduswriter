import {DataTable} from "simple-datatables"

import {DocTemplatesActions} from "./actions"
import {OverviewMenuView, escapeText, findTarget, whenReady, postJson, addAlert, baseBodyTemplate, ensureCSS, setDocTitle, DatatableBulk} from "../common"
import {SiteMenu} from "../menu"
import {menuModel, bulkMenuModel} from "./menu"
import {FeedbackTab} from "../feedback"


export class DocTemplatesOverview {
    // A class that contains everything that happens on the templates page.
    // It is currently not possible to initialize more than one such class, as it
    // contains bindings to menu items, etc. that are uniquely defined.
    constructor({app, user}) {
        this.app = app
        this.user = user
        this.mod = {}
        this.templateList = []
        this.styles = false
    }

    init() {
        return whenReady().then(() => {
            this.render()
            const smenu = new SiteMenu(this.app, "templates")
            smenu.init()
            new DocTemplatesActions(this)
            this.menu = new OverviewMenuView(this, menuModel)
            this.menu.init()
            this.bind()
            return this.getTemplateListData()
        })
    }

    render() {
        this.dom = document.createElement('body')
        this.dom.innerHTML = baseBodyTemplate({
            contents: '',
            user: this.user,
            hasOverview: true
        })
        document.body = this.dom
        ensureCSS([
            'add_remove_dialog.css',
            'access_rights_dialog.css'
        ])
        setDocTitle(gettext('Document Templates Overview'), this.app)
        const feedbackTab = new FeedbackTab()
        feedbackTab.init()
    }

    onResize() {
        if (!this.table) {
            return
        }
        this.initTable()
    }

    /* Initialize the overview table */
    initTable() {
        const tableEl = document.createElement('table')
        tableEl.classList.add('fw-data-table')
        tableEl.classList.add('fw-large')
        this.dom.querySelector('.fw-contents').innerHTML = ''
        this.dom.querySelector('.fw-contents').appendChild(tableEl)

        this.dtBulk = new DatatableBulk(this, bulkMenuModel())

        const hiddenCols = [0]

        if (window.innerWidth < 500) {
            hiddenCols.push(1)
        }

        this.table = new DataTable(tableEl, {
            searchable: true,
            paging: false,
            scrollY: `${Math.max(window.innerHeight - 360, 100)}px`,
            labels: {
                noRows: gettext("No document templates available") // Message shown when there are no search results
            },
            layout: {
                top: ""
            },
            data: {
                headings: ['', this.dtBulk.getHTML(), gettext("Title"), gettext("Created"), gettext("Last changed"), ''],
                data: this.templateList.map(docTemplate => this.createTableRow(docTemplate))
            },
            columns: [
                {
                    select: hiddenCols,
                    hidden: true
                },
                {
                    select: [1, 5],
                    sortable: false
                }
            ]
        })
        this.lastSort = {column: 0, dir: 'asc'}

        this.table.on('datatable.sort', (column, dir) => {
            this.lastSort = {column, dir}
        })

        this.dtBulk.init(this.table.table)
    }

    createTableRow(docTemplate) {
        return [
            String(docTemplate.id),
            `<input type="checkbox" class="entry-select" data-id="${docTemplate.id}">`,
            `<span class="${ docTemplate.is_owner ? 'fw-data-table-title ' : '' }fw-inline">
                <i class="far fa-file"></i>
                ${
    docTemplate.is_owner ?
        `<a href='/templates/${docTemplate.id}/'>
                        ${
    docTemplate.title.length ?
        escapeText(docTemplate.title) :
        gettext('Untitled')
}
                    </a>` :
        docTemplate.title.length ?
            escapeText(docTemplate.title) :
            gettext('Untitled')
}
            </span>`,
            docTemplate.added, // format?
            docTemplate.updated, // format ?
            `<span class="delete-doc-template fw-inline fw-link-text" data-id="${docTemplate.id}" data-title="${escapeText(docTemplate.title)}">
                ${docTemplate.is_owner ? '<i class="fa fa-trash-alt"></i>' : ''}
           </span>`
        ]
    }

    removeTableRows(ids) {
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

    addDocTemplateToTable(docTemplate) {
        this.table.insert({data: [this.createTableRow(docTemplate)]})
        // Redo last sort
        this.table.columns().sort(this.lastSort.column, this.lastSort.dir)
    }

    getTemplateListData() {
        if (this.app.isOffline()) {
            return this.showCached()
        }
        return postJson(
            '/api/user_template_manager/list/'
        ).then(
            ({json}) => {
                this.updateIndexedDB(json)
                this.initializeView(json)
            }
        ).catch(
            error => {
                if (this.app.isOffline()) {
                    return this.showCached()
                } else {
                    addAlert(
                        'error',
                        gettext('Document templates loading failed.')
                    )
                    throw (error)
                }
            }
        )
    }

    initializeView(json) {
        this.templateList = json.document_templates
        this.initTable()
    }

    showCached() {
        return this.loaddatafromIndexedDB().then(json => this.initializeView(json))
    }

    loaddatafromIndexedDB() {
        return this.app.indexedDB.readAllData("templates_list").then(response => ({document_templates: response}))
    }

    updateIndexedDB(json) {
        // Clear data if any present
        this.app.indexedDB.clearData("templates_list").then(() => {
            this.app.indexedDB.insertData("templates_list", json.document_templates)
        })
    }


    bind() {
        this.dom.addEventListener('click', event => {
            const el = {}
            switch (true) {
            case findTarget(event, '.delete-doc-template', el): {
                const docTemplateId = parseInt(el.target.dataset.id)
                this.mod.actions.deleteDocTemplatesDialog([docTemplateId])
                break
            }
            case findTarget(event, 'a', el):
                if (el.target.hostname === window.location.hostname && el.target.getAttribute('href')[0] === '/') {
                    event.preventDefault()
                    this.app.goTo(el.target.href)
                }
                break
            default:
                break
            }
        })
    }

    getSelected() {
        return Array.from(
            this.dom.querySelectorAll('.entry-select:checked:not(:disabled)')
        ).map(el => parseInt(el.getAttribute('data-id')))
    }
}
