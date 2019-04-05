import {BibLatexFileExporter} from "../export"
import {BibEntryForm} from "../form"
import {BibLatexFileImportDialog} from "../import"

export const menuModel = () => ({
    content: [
        {
            type: 'select-action-dropdown',
            id: 'bib_selector',
            open: false,
            checked: false,
            checkAction: _overview => {
                const checkboxes = document.querySelectorAll('input.entry-select[type=checkbox]')
                checkboxes.forEach(checkbox => checkbox.checked = true)
            },
            uncheckAction: _overview => {
                const checkboxes = document.querySelectorAll('input.entry-select[type=checkbox]')
                checkboxes.forEach(checkbox => checkbox.checked = false)
            },
            content: [
                {
                    title: gettext('Delete selected'),
                    action: overview => {
                        const ids = overview.getSelected().map(id => parseInt(id))
                        if (ids.length) {
                            overview.deleteBibEntryDialog(ids)
                        }
                    },
                    order: 0
                },
                {
                    title: gettext('Export selected'),
                    action: overview => {
                        const ids = overview.getSelected()
                        if (ids.length) {
                            const exporter = new BibLatexFileExporter(overview.app.bibDB, ids)
                            exporter.init()
                        }
                    },
                    order: 1
                }
            ],
            order: 0
        },
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
            type: 'button',
            icon: 'pencil',
            title: gettext('Edit categories'),
            action: overview => overview.editCategoriesDialog(),
            order: 2
        },
        {
            type: 'button',
            icon: 'plus-circle',
            title: gettext('Register new source'),
            action: overview => {
                const form = new BibEntryForm(overview.app.bibDB)
                form.init().then(
                    idTranslations => {
                        const ids = idTranslations.map(idTrans => idTrans[1])
                        return overview.updateTable(ids)
                    }
                )
            },
            order: 3
        },
        {
            type: 'button',
            icon: 'upload',
            title: gettext('Upload BibTeX file'),
            action: overview => {
                const fileImporter = new BibLatexFileImportDialog(
                    overview.app.bibDB,
                    ids => overview.updateTable(ids),
                    overview.staticUrl
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
