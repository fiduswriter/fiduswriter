import {ModCollabDocChanges} from "./doc-changes"
import {ModCollabChat} from "./chat"
import {ModCollabColors} from "./colors"
import {removeCollaboratorSelection} from "../statePlugins"


export class ModCollab {
    constructor(editor) {
        editor.mod.collab = this
        this.editor = editor
        this.participants = []
        this.colorIds = {}
        this.sessionIds = false
        this.newColor = 0
        this.collaborativeMode = false
        new ModCollabDocChanges(this)
        new ModCollabChat(this)
        new ModCollabColors(this)
    }

    updateParticipantList(participantArray) {
        let allSessionIds = [],
            participantObj = {}

        participantArray.forEach(participant => {
            const entry = participantObj[participant.id]
            allSessionIds.push(participant.session_id)
            if (entry) {
                entry.sessionIds.push(participant.session_id)
            } else {
                participant.sessionIds = [participant.session_id]
                delete participant.session_id
                participantObj[participant.id] = participant
            }
        })

        this.participants = Object.values(participantObj)
        if (!this.sessionIds) {
            if (allSessionIds.length === 1) {
                // We just connected to the editor and we are the only connected
                // party. This is a good time to clean up the databases, removing
                // unused images and bibliography items.
                this.editor.mod.db.clean()
            }
            this.sessionIds = []
        }
        // Check if each of the old session IDs is still present in last update.
        // If not, remove the corresponding carets if any.
        this.sessionIds.forEach(session_id => {
            if (!allSessionIds.includes(session_id)) {
                let transaction = removeCollaboratorSelection(
                    this.editor.view.state,
                    {session_id}
                )
                let fnTransaction = removeCollaboratorSelection(
                    this.editor.mod.footnotes.fnEditor.view.state,
                    {session_id}
                )
                if (transaction) {
                    this.editor.view.dispatch(transaction)
                }
                if (fnTransaction) {
                    this.editor.mod.footnotes.fnEditor.view.dispatch(fnTransaction)
                }
            }
        })
        this.sessionIds = allSessionIds
        if (participantArray.length > 1) {
            this.collaborativeMode = true
        } else if (participantArray.length === 1) {
            this.collaborativeMode = false
        }
        this.participants.forEach(participant => {
            /* We assign a color to each user. This color stays even if the user
            * disconnects or the participant list is being updated.
            */
            if (!(participant.id in this.colorIds)) {
                this.colorIds[participant.id] = this.newColor
                this.newColor++
            }
            participant.colorId = this.colorIds[participant.id]
        })
        this.colors.provideUserColorStyles(this.newColor)
        if (this.editor.menu.headerView) {
            this.editor.menu.headerView.update()
        }
        this.chat.showChat(participantArray)
    }
}
