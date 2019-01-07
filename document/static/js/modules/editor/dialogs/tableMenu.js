import {tableMenuTemplate} from "./templates"
import {addAlert, Dialog} from "../../common"
import {addColumnAfter, addColumnBefore, deleteColumn, addRowBefore, addRowAfter, deleteRow, deleteTable,
    mergeCells, splitCell, setCellAttr, toggleHeaderRow, toggleHeaderColumn, toggleHeaderCell}
from "prosemirror-tables"
import {TableResizeDialog} from  "../dialogs"

export class tableMenuDialog {
    constructor(node, view, options) {
        this.node = node
        this.view = view
        this.options = options
        this.dialog = false
        this.listeners ={}
        
    }

    init() {
        this.listeners.onclick = event => this.onclick(event)
        document.body.addEventListener('click', this.listeners.onclick)
        this.dialog = new Dialog({
            body: tableMenuTemplate(this.options),
            width: 260,
            height: 450,
            onClose: () => this.view.focus()
        })
        this.dialog.open()

    }
    destroy() {
        document.body.removeEventListener('click', this.listeners.onclick)
    }

    close(){
        this.dialog.dialogEl.parentElement.removeChild(this.dialog.dialogEl)
        this.dialog.backdropEl.parentElement.removeChild(this.dialog.backdropEl)
    }

    onclick(event){
        event.preventDefault()
            event.stopImmediatePropagation()
        const target = event.target
        if(target.matches('li.menu-item')) {
            let menuNumber = target.dataset.index;
            const menuItem = tableMenuModel().content[menuNumber];
            if (menuItem.disabled && menuItem.disabled(this.options.editor)) {
                return
            }
            menuItem.action(this.options.editor)
            this.destroy()
            this.close()
        }
}

}
// from https://github.com/ProseMirror/prosemirror-tables/blob/master/src/util.js
const findTable = function(state) {
    const $head = state.selection.$head
    for (let d = $head.depth; d > 0; d--) if ($head.node(d).type.spec.tableRole == "table") return $head.node(d)
    return false
}

const tableAddedByUser = function(table, userId) {
    return table.attrs.track.find(track => (track.type==='insertion' && track.user === userId)) ? true : false
}

export const tableMenuModel = ()=> ({
        open:true,
        content: [
            {
                title: editor => `${gettext('Add row above')}${editor.view.state.doc.firstChild.attrs.tracked ? ` (${gettext('Not tracked')})` : ''}`,
                type: 'action',
                tooltip: gettext('Add a row above the current row'),
                order: 0,
                action: editor => {
                    addRowBefore(editor.currentView.state, tr => editor.currentView.dispatch(tr.setMeta('untracked', true)))
                },
                disabled: editor => {
                    const table = findTable(editor.currentView.state)
                    if (
                        !table ||
                        (
                            editor.docInfo.access_rights === 'write-tracked' &&
                            !tableAddedByUser(table, editor.user.id)
                        )
                    ) {
                        return true
                    } else {
                        return false
                    }
                }
            },
    
            {
                title: editor => `${gettext('Add row below')}${editor.view.state.doc.firstChild.attrs.tracked ? ` (${gettext('Not tracked')})` : ''}`,
                type: 'action',
                tooltip: gettext('Add a row below the current row'),
                order: 1,
                action: editor => {
                    addRowAfter(editor.currentView.state, tr => editor.currentView.dispatch(tr.setMeta('untracked', true)))
                },
                disabled: editor => {
                    const table = findTable(editor.currentView.state)
                    if (
                        !table ||
                        (
                            editor.docInfo.access_rights === 'write-tracked' &&
                            !tableAddedByUser(table, editor.user.id)
                        )
                    ) {
                        return true
                    } else {
                        return false
                    }
                }
            },
            {
                title: editor => `${gettext('Add column left')}${editor.view.state.doc.firstChild.attrs.tracked ? ` (${gettext('Not tracked')})` : ''}`,
                type: 'action',
                tooltip: gettext('Add a column to the left of the current column'),
                order: 2,
                action: editor => {
                    addColumnBefore(editor.currentView.state, tr => editor.currentView.dispatch(tr.setMeta('untracked', true)))
                },
                disabled: editor => {
                    const table = findTable(editor.currentView.state)
                    if (
                        !table ||
                        (
                            editor.docInfo.access_rights === 'write-tracked' &&
                            !tableAddedByUser(table, editor.user.id)
                        )
                    ) {
                        return true
                    } else {
                        return false
                    }
                }
            },
            {
                title: editor => `${gettext('Add column right')}${editor.view.state.doc.firstChild.attrs.tracked ? ` (${gettext('Not tracked')})` : ''}`,
                type: 'action',
                tooltip: gettext('Add a column to the right of the current column'),
                order: 3,
                action: editor => {
                    addColumnAfter(editor.currentView.state, tr => editor.currentView.dispatch(tr.setMeta('untracked', true)))
                },
                disabled: editor => {
                    const table = findTable(editor.currentView.state)
                    if (
                        !table ||
                        (
                            editor.docInfo.access_rights === 'write-tracked' &&
                            !tableAddedByUser(table, editor.user.id)
                        )
                    ) {
                        return true
                    } else {
                        return false
                    }
                }
            },
            {
                type: 'separator',
                order: 4
            },
            {
                title: editor => `${gettext('Delete row')}${editor.view.state.doc.firstChild.attrs.tracked ? ` (${gettext('Not tracked')})` : ''}`,
                type: 'action',
                tooltip: gettext('Delete current row'),
                order: 5,
                action: editor => {
                    deleteRow(editor.currentView.state, tr => editor.currentView.dispatch(tr.setMeta('untracked', true)))
                },
                disabled: editor => {
                    const table = findTable(editor.currentView.state)
                    if (
                        !table ||
                        (
                            editor.docInfo.access_rights === 'write-tracked' &&
                            !tableAddedByUser(table, editor.user.id)
                        )
                    ) {
                        return true
                    } else {
                        return false
                    }
                }
            },
            {
                title: editor => `${gettext('Delete column')}${editor.view.state.doc.firstChild.attrs.tracked ? ` (${gettext('Not tracked')})` : ''}`,
                type: 'action',
                tooltip: gettext('Delete current column'),
                order: 6,
                action: editor => {
                    deleteColumn(editor.currentView.state, tr => editor.currentView.dispatch(tr.setMeta('untracked', true)))
                },
                disabled: editor => {
                    const table = findTable(editor.currentView.state)
                    if (
                        !table ||
                        (
                            editor.docInfo.access_rights === 'write-tracked' &&
                            !tableAddedByUser(table, editor.user.id)
                        )
                    ) {
                        return true
                    } else {
                        return false
                    }
                }
            },
            {
                type: 'separator',
                order: 7,
            },
            {
                title: editor => `${gettext('Merge cells')}${editor.view.state.doc.firstChild.attrs.tracked ? ` (${gettext('Not tracked')})` : ''}`,
                type: 'action',
                tooltip: gettext('Merge selected cells'),
                order: 8,
                action: editor => {
                    mergeCells(editor.currentView.state, tr => editor.currentView.dispatch(tr.setMeta('untracked', true)))
                },
                disabled: editor => {
                    const table = findTable(editor.currentView.state)
                    if (
                        !table ||
                        editor.currentView.state.selection.jsonID !== 'cell' ||
                        editor.currentView.state.selection.$headCell.pos ===
                        editor.currentView.state.selection.$anchorCell.pos ||
                        (
                            editor.docInfo.access_rights === 'write-tracked' &&
                            !tableAddedByUser(table, editor.user.id)
                        )
                    ) {
                        return true
                    } else {
                        return false
                    }
                }
    
            },
            {
                title: editor => `${gettext('Split cells')}${editor.view.state.doc.firstChild.attrs.tracked ? ` (${gettext('Not tracked')})` : ''}`,
                type: 'action',
                tooltip: gettext('Split selected cell'),
                order: 9,
                action: editor => {
                    splitCell(editor.currentView.state, tr => editor.currentView.dispatch(tr.setMeta('untracked', true)))
                },
                disabled: editor => {
                    const table = findTable(editor.currentView.state)
                    if (
                        !table ||
                        editor.currentView.state.selection.jsonID !== 'cell' ||
                        editor.currentView.state.selection.$headCell.pos ===
                        editor.currentView.state.selection.$anchorCell.pos ||
                        (
                            editor.docInfo.access_rights === 'write-tracked' &&
                            !tableAddedByUser(table, editor.user.id)
                        )
                    ) {
                        return true
                    } else {
                        return false
                    }
                }
            },
            {
                type: 'separator',
                order: 10,
            },
            {
                title: editor => `${gettext('Toggle header row')}${editor.view.state.doc.firstChild.attrs.tracked ? ` (${gettext('Not tracked')})` : ''}`,
                type: 'action',
                tooltip: gettext('Toggle header-status of currently selected row'),
                order: 11,
                action: editor => {
                    toggleHeaderRow(editor.currentView.state, editor.currentView.dispatch)
                },
                disabled: editor => {
                    const table = findTable(editor.currentView.state)
                    if (
                        !table ||
                        (
                            editor.docInfo.access_rights === 'write-tracked' &&
                            !tableAddedByUser(table, editor.user.id)
                        )
                    ) {
                        return true
                    } else {
                        return false
                    }
                }
            },
            {
                title: editor => `${gettext('Toggle header column')}${editor.view.state.doc.firstChild.attrs.tracked ? ` (${gettext('Not tracked')})` : ''}`,
                type: 'action',
                tooltip: gettext('Toggle header-status of currently selected column'),
                order: 12,
                action: editor => {
                    toggleHeaderColumn(editor.currentView.state, editor.currentView.dispatch)
                },
                disabled: editor => {
                    const table = findTable(editor.currentView.state)
                    if (
                        !table ||
                        (
                            editor.docInfo.access_rights === 'write-tracked' &&
                            !tableAddedByUser(table, editor.user.id)
                        )
                    ) {
                        return true
                    } else {
                        return false
                    }
                }
            },
            {
                title: editor => `${gettext('Toggle header cell')}${editor.view.state.doc.firstChild.attrs.tracked ? ` (${gettext('Not tracked')})` : ''}`,
                type: 'action',
                tooltip: gettext('Toggle header-status of currently selected cells'),
                order: 13,
                action: editor => {
                    toggleHeaderCell(editor.currentView.state, editor.currentView.dispatch)
                },
                disabled: editor => {
                    const table = findTable(editor.currentView.state)
                    if (
                        !table ||
                        (
                            editor.docInfo.access_rights === 'write-tracked' &&
                            !tableAddedByUser(table, editor.user.id)
                        )
                    ) {
                        return true
                    } else {
                        return false
                    }
                }
            },
            {
                type: 'separator',
                order: 14,
            },
            {
                title: gettext('Delete table'),
                type: 'action',
                tooltip: gettext('Delete currently selected table'),
                order: 15,
                action: editor => {
                    deleteTable(editor.currentView.state, editor.currentView.dispatch)
                },
                disabled: editor => !findTable(editor.currentView.state)
            },
            {
                title: gettext('Resize/Reposition'),
                type: 'action',
                tooltip: gettext('Resize/Reposition a table.'),
                order: 16,
                action: editor => {
                    const dialog = new TableResizeDialog(editor)
                    dialog.init()
                    return false
                },
                disabled: editor => !findTable(editor.currentView.state)
            },
    
        ]
})
