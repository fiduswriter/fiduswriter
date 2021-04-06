import {FigureDialog} from "../../dialogs"
import {figureMenuAction} from "./utils"

export const figureMenuModel = () => ({
    content: [
        {
            title: `${gettext('Configure')} ...`,
            type: 'action',
            tooltip: gettext('Configure the figure.'),
            order: 1,
            action: editor => {
                const dialog = new FigureDialog(editor)
                dialog.init()
                return false
            },
            disabled: editor => !(editor.currentView.state.selection.node?.type.name === 'figure') || editor.currentView.state.selection.node?.attrs.track?.find(track => track.type === 'deletion')
        },
        {
            title: gettext('Delete figure'),
            type: 'action',
            icon: 'trash-alt',
            tooltip: gettext('Delete the figure'),
            order: 2,
            action: editor => {
                const tr = editor.currentView.state.tr
                tr.deleteSelection()
                editor.currentView.dispatch(tr)
            },
            disabled: editor => !(editor.currentView.state.selection.node?.type.name === 'figure') || editor.currentView.state.selection.node?.attrs.track?.find(track => track.type === 'deletion')
        }
    ]
})

export const figureWidthMenuModel = () => ({
    content: [
        {
            title: '10%',
            type: 'action',
            order: 0,
            value: '10',
            action: figureDialog => {
                figureMenuAction("10", figureDialog)
            },
            selected: false
        },
        {
            title: '20%',
            type: 'action',
            order: 0,
            value: '20',
            action: figureDialog => {
                figureMenuAction("20", figureDialog)
            },
            selected: false
        },
        {
            title: '30%',
            type: 'action',
            order: 0,
            value: '30',
            action: figureDialog => {
                figureMenuAction("30", figureDialog)
            },
            selected: false
        },
        {
            title: '40%',
            type: 'action',
            order: 0,
            value: '40',
            action: figureDialog => {
                figureMenuAction("40", figureDialog)
            },
            selected: false
        },
        {
            title: '50%',
            type: 'action',
            order: 0,
            value: '50',
            action: figureDialog => {
                figureMenuAction("50", figureDialog)
            },
            selected: false
        },
        {
            title: '60%',
            type: 'action',
            order: 0,
            value: '60',
            action: figureDialog => {
                figureMenuAction("60", figureDialog)
            },
            selected: false
        },
        {
            title: '70%',
            type: 'action',
            order: 0,
            value: '70',
            action: figureDialog => {
                figureMenuAction("70", figureDialog)
            },
            selected: false
        },
        {
            title: '80%',
            type: 'action',
            order: 0,
            value: '80',
            action: figureDialog => {
                figureMenuAction("80", figureDialog)
            },
            selected: false
        },
        {
            title: '90%',
            type: 'action',
            order: 0,
            value: '90',
            action: figureDialog => {
                figureMenuAction("90", figureDialog)
            },
            selected: false
        },
        {
            title: '100%',
            type: 'action',
            order: 0,
            value: '100',
            action: figureDialog => {
                figureMenuAction("100", figureDialog)
            },
            selected: false
        }
    ]
})