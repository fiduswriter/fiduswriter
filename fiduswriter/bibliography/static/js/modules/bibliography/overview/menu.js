import {BibLatexFileImportDialog} from "../import"
import {BibLatexFileExporter} from "../export"

export const bulkMenuModel = () => ({
    content: [
        {
            title: gettext('Delete selected'),
            tooltip: gettext('Delete selected bibliography entries.'),
            action: overview => {
                const ids = overview.getSelected().map(id => parseInt(id))
                if (ids.length) {
                    overview.deleteBibEntryDialog(ids)
                }
            },
            disabled: overview => !overview.getSelected().length
        }, {
            title: gettext('Export selected'),
            tooltip: gettext('Export selected bibliography entries.'),
            action: overview => {
                const ids = overview.getSelected()
                if (ids.length) {
                    const exporter = new BibLatexFileExporter(overview.app.bibDB, ids)
                    exporter.init()
                }
            },
            disabled: overview => !overview.getSelected().length
        }
    ]
})

export const menuModel = () => ({
    content: [
        {
            type: 'dropdown',
            id: 'cat_selector',
            content : [
                {
                    title: gettext('All categories'),
                    action: _overview => {
                        const trs = document.querySelectorAll('#bibliography > tbody > tr')
                        trs.forEach(tr => tr.style.display = '')
                    }
                }
            ],
            order: 1
        },
        {
            type: 'text',
            title: gettext('Edit categories'),
            action: overview => overview.editCategoriesDialog(),
            order: 2
        },
        {
            type: 'text',
            title: gettext('Register new source'),
            action: overview => {
                import("../form").then(({BibEntryForm}) => {
                    const form = new BibEntryForm(overview.app.bibDB)
                    form.init().then(
                        idTranslations => {
                            const ids = idTranslations.map(idTrans => idTrans[1])
                            return overview.updateTable(ids)
                        }
                    )
                })
            },
            order: 3
        },
        {
            type: 'text',
            title: gettext('Upload BibTeX file'),
            action: overview => {
                const fileImporter = new BibLatexFileImportDialog(
                    overview.app.bibDB,
                    ids => overview.updateTable(ids)
                )
                fileImporter.init()
            },
            order: 4
        },
        {
            type: 'search',
            icon: 'search',
            title: gettext('Search bibliography'),
            input: (overview, text) => overview.table.search(text),
            order: 5
        }
    ]
})
