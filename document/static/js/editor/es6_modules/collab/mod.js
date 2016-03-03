import {ModCollabDocChanges} from "./doc-changes"

export class ModCollab {
    constructor(editor) {
        editor.mod.collab = this
        this.editor = editor
        this.participants = []
        this.collaborativeMode = false
        new ModCollabDocChanges(this)
    }

    updateParticipantList(participant_list) {
        this.participants = _.map(_.groupBy(participant_list,
            'id'), function (entry) {
            return entry[0]
        })
        if (participant_list.length > 1) {
            this.collaborativeMode = true
        } else if (participant_list.length === 1) {
            this.collaborativeMode = false
        }
        chatHelpers.updateParticipantList(participant_list)
    }
}
