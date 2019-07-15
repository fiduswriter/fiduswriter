import {toggleMark} from "prosemirror-commands"

import {COMMENT_ONLY_ROLES} from "../.."
import {randomAnchorId} from "../../../schema/common"

function markAvailable(editor, markName) {
      let markInDocParts = false
      editor.view.state.doc.firstChild.forEach(docPart => {
          if (docPart.attrs.elements && docPart.attrs.marks.includes(markName)) {
              markInDocParts = true
          }
      })
      return (
          editor.view.state.doc.firstChild.attrs.footnote_marks.includes(markName) ||
          markInDocParts
      )
}

function markDisabled(editor, markName) {
    if (editor.currentView === editor.view) {
        // main editor
        const anchorDocPart = editor.currentView.state.selection.$anchor.node(2),
            headDocPart = editor.currentView.state.selection.$head.node(2)
        return !anchorDocPart ||
            headDocPart !== anchorDocPart ||
            !anchorDocPart.attrs.marks ||
            !anchorDocPart.attrs.marks.includes(markName)
    } else {
        // footnote editor
        const anchorFootnote = editor.currentView.state.selection.$anchor.node(1),
            headFootnote = editor.currentView.state.selection.$head.node(1)

        return !anchorFootnote ||
            headFootnote !== anchorFootnote ||
            !editor.view.state.doc.firstChild.attrs.footnote_marks.includes(markName)
    }

}

export const selectionMenuModel = () => ({
    content: [
        {
            type: 'button',
            title: gettext('Comment'),
            icon: 'comment',
            action: editor => {
                editor.mod.comments.interactions.createNewComment()
                return false
            },
            disabled: editor => editor.currentView.state.selection.$anchor.depth < 2,
            selected: editor => !!editor.currentView.state.selection.$head.marks().some(
                mark => mark.type.name === 'comment'
            ),
            order: 18
        },
        {
            type: 'button',
            title: gettext('Anchor'),
            icon: 'anchor',
            action: editor => {
                const mark = editor.currentView.state.schema.marks['anchor']
                const command = toggleMark(mark, {id: randomAnchorId()})
                command(editor.currentView.state, tr => editor.currentView.dispatch(tr))
            },
            available: editor => !COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights) && markAvailable(editor, 'anchor'),
            disabled: editor => markDisabled(editor, 'anchor'),
            selected: editor => !!editor.currentView.state.selection.$head.marks().some(
                mark => mark.type.name === 'anchor'
            ),
            order: 19
        }
    ]
})
