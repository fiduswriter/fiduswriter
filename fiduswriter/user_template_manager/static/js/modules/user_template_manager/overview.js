import {DataTable} from "simple-datatables"

import {DocTemplatesActions} from "./actions"
import {OverviewMenuView, escapeText, findTarget, whenReady, postJson, activateWait, deactivateWait, addAlert, baseBodyTemplate, ensureCSS, setDocTitle, DatatableBulk} from "../common"
import {SiteMenu} from "../menu"
import {menuModel, bulkModel} from "./menu"
import {FeedbackTab} from "../feedback"


export class DocTemplatesOverview {
    // A class that contains everything that happens on the templates page.
    // It is currently not possible to initialize more than one such class, as it
    // contains bindings to menu items, etc. that are uniquely defined.
    constructor({app, user, staticUrl}) {
        this.app = app
        this.user = user
        this.staticUrl = staticUrl
        this.mod = {}
        this.templateList = []
        this.styles = false
    }

    init() {
        return whenReady().then(() => {
            this.render()
            const smenu = new SiteMenu("templates")
            smenu.init()
            new DocTemplatesActions(this)
            this.menu = new OverviewMenuView(this, menuModel)
            this.menu.init()
            this.bind()
            return this.gettemplateListData()
        })
    }

    render() {
        this.dom = document.createElement('body')
        this.dom.innerHTML = baseBodyTemplate({
            contents: '',
            user: this.user,
            staticUrl: this.staticUrl,
            hasOverview: true
        })
        document.body = this.dom
        ensureCSS([
            'add_remove_dialog.css',
            'access_rights_dialog.css'
        ], this.staticUrl)
        setDocTitle(gettext('Document Templates Overview'), this.app)
        const feedbackTab = new FeedbackTab({staticUrl: this.staticUrl})
        feedbackTab.init()
    }

    /* Initialize the overview table */
    initTable() {
        const tableEl = document.createElement('table')
        tableEl.classList.add('fw-data-table')
        tableEl.classList.add('fw-large')
        this.dom.querySelector('.fw-contents').appendChild(tableEl)

        const dtBulk = new DatatableBulk(this, bulkModel)

        this.table = new DataTable(tableEl, {
            searchable: true,
            paging: false,
            scrollY: "calc(100vh - 320px)",
            labels: {
                noRows: gettext("No document templates available") // Message shown when there are no search results
            },
            layout: {
                top: ""
            },
            data: {
                headings: ['', dtBulk.getHTML(), gettext("Title"), gettext("Created"), gettext("Last changed"), ''],
                data: this.templateList.map(docTemplate => this.createTableRow(docTemplate))
            },
            columns: [
                {
                    select: 0,
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

        dtBulk.init(this.table.table)
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

    gettemplateListData() {
        activateWait()
        return postJson(
            '/api/user_template_manager/list/'
        ).catch(
            error => {
                addAlert('error', gettext('Cannot load data of document templates.'))
                throw (error)
            }
        ).then(
            ({json}) => {
                this.templateList = json.document_templates

                this.initTable()
            }
        ).then(
            () => deactivateWait()
        )
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
