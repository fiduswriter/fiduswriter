import {FigureDialog} from "../../dialogs"

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
