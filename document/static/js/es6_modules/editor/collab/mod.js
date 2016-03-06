import {ModCollabDocChanges} from "./doc-changes"
import {ModCollabChat} from "./chat"

export class ModCollab {
    constructor(editor) {
        editor.mod.collab = this
        this.editor = editor
        this.participants = []
        this.collaborativeMode = false
        new ModCollabDocChanges(this)
        new ModCollabChat(this)
    }

    updateParticipantList(participants) {
        this.participants = _.map(_.groupBy(participants,
            'id'), function (entry) {
            return entry[0]
        })
        if (participants.length > 1) {
            this.collaborativeMode = true
        } else if (participants.length === 1) {
            this.collaborativeMode = false
        }
        this.chat.updateParticipantList(participants)
    }
}
