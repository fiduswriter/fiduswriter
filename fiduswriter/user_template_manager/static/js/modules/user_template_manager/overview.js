import {baseBodyTemplate} from "@fiduswriter/common/common"
import {FeedbackTab} from "@fiduswriter/common/feedback"
import {SiteMenu} from "@fiduswriter/common/menu"
import {
    OverviewDataTable,
    OverviewMenuView,
    addAlert,
    ensureCSS,
    escapeText,
    findTarget,
    getJson,
    setDocTitle,
    whenReady
} from "fwtoolkit"
import {DocTemplatesActions} from "./actions"
import {bulkMenuModel, menuModel} from "./menu"

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

        this.lastSort = {column: 0, dir: "asc"}
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
        this.dom = document.createElement("body")
        this.dom.innerHTML = baseBodyTemplate({
            contents: "",
            user: this.user,
            hasOverview: true,
            app: this.app
        })
        document.body = this.dom
        ensureCSS([
            staticUrl("css/add_remove_dialog.css"),
            staticUrl("css/access_rights_dialog.css")
        ])
        setDocTitle(gettext("Document Templates Overview"), this.app)
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
        if (this.overviewTable) {
            this.overviewTable.destroy()
            this.overviewTable = null
        }
        this.table = null
        this.dtBulk = null

        const contentsEl = this.dom.querySelector(".fw-contents")
        contentsEl.innerHTML = ""

        const hiddenCols = [0]

        if (window.innerWidth < 500) {
            hiddenCols.push(1)
        }

        this.overviewTable = new OverviewDataTable({
            dom: contentsEl,
            classes: ["fw-data-table", "fw-large"],
            columns: [
                {
                    select: 0,
                    type: "number"
                },
                {
                    select: 1,
                    sortable: false,
                    type: "boolean"
                },
                {
                    select: hiddenCols,
                    hidden: true
                },
                {
                    select: 5,
                    sortable: false
                },
                {
                    select: [this.lastSort.column],
                    sort: this.lastSort.dir
                }
            ],
            data: this.templateList.map(docTemplate =>
                this.createTableRow(docTemplate)
            ),
            idColumn: 0,
            checkboxColumn: 1,
            bulkMenu: bulkMenuModel(),
            bulkMenuPage: this,
            searchable: true,
            scrollY: `${Math.max(window.innerHeight - 360, 100)}px`,
            tabIndex: 1,
            labels: {
                noRows: gettext("No document templates available"),
                noResults: gettext("No document templates found") // Message shown when there are no search results
            },
            headings: [
                "",
                "",
                gettext("Title"),
                gettext("Created"),
                gettext("Last changed"),
                ""
            ],
            template: (
                options,
                _dom
            ) => `<div class='${options.classes.container}'${options.scrollY.length ? ` style='height: ${options.scrollY}; overflow-Y: auto;'` : ""}></div>
            <div class='${options.classes.bottom}'>
                <nav class='${options.classes.pagination}'></nav>
            </div>`,
            rowRender: (row, tr, _index) => {
                const id = row.cells[0].data
                const inputNode = {
                    nodeName: "input",
                    attributes: {
                        type: "checkbox",
                        class: "entry-select fw-check",
                        "data-id": String(id),
                        id: `template-${id}`
                    }
                }
                if (row.cells[1].data) {
                    inputNode.attributes.checked = true
                }
                tr.childNodes[0].childNodes = [
                    inputNode,
                    {
                        nodeName: "label",
                        attributes: {
                            for: `template-${id}`
                        }
                    }
                ]
            },
            onEnter: (row, _event) => {
                if (this.getSelected().length > 0) {
                    return
                }
                const rowIndex = this.table.data.data.indexOf(row)
                const link = this.table.dom.querySelector(
                    `tr[data-index="${rowIndex}"] a`
                )
                if (link) {
                    link.click()
                }
            },
            onDelete: row => {
                const templateId = row.cells[0].data
                this.deleteDocTemplatesDialog([templateId])
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

    createTableRow(docTemplate) {
        return [
            docTemplate.id,
            false, // Checkbox
            `<span class="${docTemplate.is_owner ? "fw-data-table-title " : ""}fw-inline">
                <i class="far fa-file"></i>
                ${
                    docTemplate.is_owner
                        ? `<a href='/templates/${docTemplate.id}/'>
                        ${
                            docTemplate.title.length
                                ? escapeText(docTemplate.title)
                                : gettext("Untitled")
                        }
                    </a>`
                        : docTemplate.title.length
                          ? escapeText(docTemplate.title)
                          : gettext("Untitled")
                }
            </span>`,
            docTemplate.added, // format?
            docTemplate.updated, // format ?
            `<span class="delete-doc-template fw-inline fw-link-text" data-id="${docTemplate.id}" data-title="${escapeText(docTemplate.title)}">
                ${docTemplate.is_owner ? '<i class="fa fa-trash-can"></i>' : ""}
           </span>`
        ]
    }

    removeTableRows(ids) {
        const existingRows = this.table.data.data
            .map((row, index) => {
                const id = row.cells[0].data
                if (ids.includes(id)) {
                    return index
                } else {
                    return false
                }
            })
            .filter(rowIndex => rowIndex !== false)

        if (existingRows.length) {
            this.table.rows.remove(existingRows)
        }
    }

    addDocTemplateToTable(docTemplate) {
        this.table.insert({data: [this.createTableRow(docTemplate)]})
        // Redo last sort
        this.table.columns.sort(this.lastSort.column, this.lastSort.dir)
    }

    getTemplateListData() {
        if (this.app.isOffline()) {
            return this.showCached()
        }
        return getJson("/api/user_template_manager/list/")
            .then(json => {
                this.updateIndexedDB(json)
                this.initializeView(json)
            })
            .catch(error => {
                if (this.app.isOffline()) {
                    return this.showCached()
                } else {
                    addAlert(
                        "error",
                        gettext("Document templates loading failed.")
                    )
                    throw error
                }
            })
    }

    initializeView(json) {
        if (this.app.page === this) {
            this.templateList = json.document_templates
            this.initTable()
            // Reset scroll position to top to prevent Safari from auto-scrolling
            // to the focused table element, which would hide the header/menu
            window.scrollTo(0, 0)
        }
    }

    showCached() {
        return this.loaddatafromIndexedDB().then(json =>
            this.initializeView(json)
        )
    }

    loaddatafromIndexedDB() {
        return this.app.indexedDB
            .readAllData("templates_list")
            .then(response => ({document_templates: response}))
    }

    updateIndexedDB(json) {
        // Clear data if any present
        this.app.indexedDB.clearData("templates_list").then(() => {
            this.app.indexedDB.insertData(
                "templates_list",
                json.document_templates
            )
        })
    }

    bind() {
        this.dom.addEventListener("click", event => {
            const el = {}
            switch (true) {
                case findTarget(event, ".delete-doc-template", el): {
                    const docTemplateId = Number.parseInt(el.target.dataset.id)
                    this.mod.actions.deleteDocTemplatesDialog([docTemplateId])
                    break
                }
                case findTarget(event, "a", el):
                    if (
                        el.target.hostname === window.location.hostname &&
                        el.target.getAttribute("href")[0] === "/"
                    ) {
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
            this.dom.querySelectorAll(".entry-select:checked:not(:disabled)")
        ).map(el => Number.parseInt(el.getAttribute("data-id")))
    }

    close() {
        if (this.table) {
            this.table.destroy()
            this.table = null
        }
        if (this.dtBulk) {
            this.dtBulk.destroy()
            this.dtBulk = null
        }
        if (this.menu) {
            this.menu.destroy()
            this.menu = null
        }
    }
}
