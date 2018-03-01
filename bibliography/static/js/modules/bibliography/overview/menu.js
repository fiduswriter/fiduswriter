import {addAlert} from "../../common"
import {BibLatexFileExporter} from "../export"
import {BibEntryForm} from "../form"
import {BibLatexFileImportDialog} from "../import"

export let menuModel = {
    content: [
        {
            type: 'select-action-dropdown',
            id: 'bib_selector',
            open: false,
            checked: false,
            checkAction: overview => {
                let checkboxes = [].slice.call(document.querySelectorAll('input.entry-select[type=checkbox]'))
                checkboxes.forEach(checkbox => checkbox.checked = true)
            },
            uncheckAction: overview => {
                let checkboxes = [].slice.call(document.querySelectorAll('input.entry-select[type=checkbox]'))
                checkboxes.forEach(checkbox => checkbox.checked = false)
            },
            content: [
                {
                    title: gettext('Delete selected'),
                    action: overview => {
                        let ids = overview.getSelected().map(id => parseInt(id))
                        if (ids.length) {
                            overview.deleteBibEntryDialog(ids)
                        }
                    }
                },
                {
                    title: gettext('Export selected'),
                    action: overview => {
                        let ids = overview.getSelected()
                        if (ids.length) {
                            let exporter = new BibLatexFileExporter(overview.bibDB, ids)
                            exporter.init()
                        }
                    }
                }
            ]
        },
        {
            type: 'dropdown',
            id: 'cat_selector',
            content : [
                {
                    title: gettext('All categories'),
                    action: overview => {
                        let trs = [].slice.call(document.querySelectorAll('#bibliography > tbody > tr'))
                        trs.forEach(tr => tr.style.display = '')
                    }
                }
            ]
        },
        {
            type: 'button',
            icon: 'pencil',
            title: gettext('Edit categories'),
            action: overview => overview.createCategoryDialog()
        },
        {
            type: 'button',
            icon: 'plus-circle',
            title: gettext('Register new source'),
            action: overview => {
                let form = new BibEntryForm(overview.bibDB)
                form.init().then(
                    idTranslations => {
                        let ids = idTranslations.map(idTrans => idTrans[1])
                        return overview.addBibList(ids)
                    }
                )
            }
        },
        {
            type: 'button',
            icon: 'upload',
            title: gettext('Upload BibTeX file'),
            action: overview => {
                let fileImporter = new BibLatexFileImportDialog(
                    overview.bibDB,
                    bibEntries => overview.addBibList(bibEntries)
                )
                fileImporter.init()
            }
        }
    ]
}
