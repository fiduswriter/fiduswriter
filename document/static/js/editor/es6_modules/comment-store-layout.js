/* Functions related to layouting of comments */

import {scheduleDOMUpdate} from "prosemirror/dist/ui/update"

export class CommentStoreLayout {
    constructor(commentStore) {
        commentStore.layout = this
        this.commentStore = commentStore
    }

    // Create a new comment as the current user, and mark it as active.
    createNewComment() {
        let id = this.commentStore.addComment(theUser.id, theUser.name, theUser.avatar, new Date().getTime(), '')
        commentHelpers.deactivateAll()
        theDocument.activeCommentId = id
        editorHelpers.documentHasChanged()
        scheduleDOMUpdate(this.commentStore.pm, commentHelpers.layoutComments)
    }




}
