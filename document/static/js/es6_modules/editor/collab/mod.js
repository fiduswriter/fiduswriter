import {ModCollabDocChanges} from "./doc-changes"
import {ModCollabChat} from "./chat"
import {ModCollabCarets} from "./carets/mod"

export class ModCollab {
    constructor(editor) {
        editor.mod.collab = this
        this.editor = editor
        this.participants = []
        this.colorIds = {}
        this.newColor = 0
        this.collaborativeMode = false
        new ModCollabDocChanges(this)
        new ModCollabChat(this)
        new ModCollabCarets(this)
    }

    updateParticipantList(participants) {
        let that = this
        this.participants = _.map(_.groupBy(participants,
            'id'), function (entries) {
            let keys = []
            // Collect all keys
            entries.forEach(function(entry){
                keys.push(entry.key)
                delete entry.key
            })
            entries[0].keys = keys
            return entries[0]
        })
        if (participants.length > 1) {
            this.collaborativeMode = true
        } else if (participants.length === 1) {
            this.collaborativeMode = false
        }
        this.participants.forEach(function(participant) {
            /* We assign a color to each user. This color stays even if the user
            * disconnects or the participant list is being updated.
            */
            if (!(participant.id in that.colorIds)) {
                that.colorIds[participant.id] = that.newColor
                that.newColor++
            }
        })
        this.chat.updateParticipantList(participants)
    }
}
