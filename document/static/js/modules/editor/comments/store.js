import {
    Comment
} from "./comment"
import {
    REVIEW_ROLES
} from ".."
import {
    addCommentDuringCreationDecoration,
    removeCommentDuringCreationDecoration
} from "../state_plugins"

export class ModCommentStore {
    constructor(mod) {
        mod.store = this
        this.mod = mod
        // a comment object for a comment that is still under construction
        this.commentDuringCreation = false
        this.reset()
    }

    reset() {
        this.comments = Object.create(null)
        this.unsent = []
    }

    mustSend() {
        // Set a timeout so that the update can be combines with other updates
        // if they happen more or less simultaneously.
        window.setTimeout(
            () => this.mod.editor.mod.collab.docChanges.sendToCollaborators(),
            100
        )
    }
    // Create a new temporary comment. This one is not going into the store yet,
    // as it is empty, shouldn't be shared and if canceled, it should go away
    // entirely.
    addCommentDuringCreation() {
        let id = -1,
            username

        if (REVIEW_ROLES.includes(this.mod.editor.docInfo.access_rights)) {
            username = `${gettext('Reviewer')} ${this.mod.editor.user.id}`
        } else {
            username = this.mod.editor.user.username
        }

        let tr = addCommentDuringCreationDecoration(this.mod.editor.view.state)
        if (tr) {
            this.mod.editor.view.dispatch(tr)
        }
        this.commentDuringCreation = {
            comment: new Comment(
                id,
                this.mod.editor.user.id,
                username,
                Date.now()-this.mod.editor.clientTimeAdjustment,
                ''),
            inDOM: false
        }
    }

    removeCommentDuringCreation() {
        if (this.commentDuringCreation) {
            this.commentDuringCreation = false
            let tr = removeCommentDuringCreationDecoration(this.mod.editor.view.state)
            if (tr) {
                this.mod.editor.view.dispatch(tr)
            }
        }
    }

    // Add a new comment to the comment database both remotely and locally.
    addComment(
        commentData,
        posFrom,
        posTo
    ) {
        let id = randomID(),
            markType = this.mod.editor.view.state.schema.marks.comment.create({
                id
            }),
            tr = this.addMark(this.mod.editor.view.state.tr, posFrom, posTo, markType)

        if (tr) {
            commentData.id = id
            commentData.answers = []
            this.addLocalComment(commentData, true)
            this.unsent.push({
                type: "create",
                id
            })
            this.mod.editor.view.dispatch(tr)
            this.mustSend()
        }
    }

    // Add marks to leaf nodes and inline nodes.
    addMark(tr, from, to, mark) {
        // add to inline nodes
        tr.addMark(from, to, mark)
        // add to leaf nodes
        tr.doc.nodesBetween(from, to, (node, pos, parent) => {
            if (!node.isLeaf) {
                return
            }
            let marks = node.marks
            if (!mark.isInSet(marks) && parent.type.allowsMarkType(mark.type)) {
                let newMarks = mark.addToSet(marks)
                tr.setNodeMarkup(pos, null, node.attrs, newMarks)
            }
        })
        if (!tr.steps.length) {
            return
        }
        return tr
    }

    removeMark(tr, from, to, mark) {
        // remove from inline nodes
        tr.removeMark(from, to, mark)
        // remove from leaf nodes
        tr.doc.nodesBetween(from, to, (node, pos, parent) => {
            if (!node.isLeaf) {
                return
            }
            let marks = node.marks
            if (mark.isInSet(marks)) {
                let newMarks = mark.removeFromSet(marks)
                tr.setNodeMarkup(pos, null, node.attrs, newMarks)
            }
        })
        if (!tr.steps.length) {
            return
        }
        return tr
    }

    loadComments(commentsData) {
        Object.values(commentsData).forEach(commentData => this.addLocalComment(commentData))
    }


    addLocalComment(
        {id, user, username, date, comment, answers, isMajor},
        local
    ) {
        if (!this.comments[id]) {
            this.comments[id] = new Comment(
                id,
                user,
                username,
                date,
                comment,
                answers,
                isMajor
            )
        }
        if (local || (!this.mod.layout.isCurrentlyEditing())) {
            this.mod.layout.layoutComments()
        }
    }

    updateComment(id, comment, isMajor) {
        this.updateLocalComment({id, comment, isMajor}, true)
        this.unsent.push({
            type: "update",
            id
        })
        this.mustSend()
    }

    updateLocalComment({id, comment, isMajor}, local) {
        if (this.comments[id]) {
            this.comments[id].comment = comment
            this.comments[id].isMajor = isMajor
        }
        if (local || (!this.mod.layout.isCurrentlyEditing())) {
            this.mod.layout.layoutComments()
        }
    }

    removeCommentMarks(id) {
        this.mod.editor.view.state.doc.descendants((node, pos, parent) => {
            let nodeStart = pos
            let nodeEnd = pos + node.nodeSize
            for (let i = 0; i < node.marks.length; i++) {
                let mark = node.marks[i]
                if (mark.type.name === 'comment' && parseInt(mark.attrs
                        .id) === id) {
                    let markType = this.mod.editor.view.state.schema
                        .marks.comment.create({
                            id
                        })
                    let tr = this.removeMark(this.mod.editor.view.state.tr, nodeStart, nodeEnd, markType)
                    if (tr) {
                        this.mod.editor.view.dispatch(tr)
                    }
                }
            }
        })
    }

    deleteLocalComment(id, local) {
        let found = this.comments[id]
        if (found) {
            delete this.comments[id]
            return true
        }
        if (local || (!this.mod.layout.isCurrentlyEditing())) {
            this.mod.layout.layoutComments()
        }
    }

    // Removes the comment from store, optionally also removes marks from document.
    deleteComment(id, removeMarks) {
        if (this.deleteLocalComment(id, true)) {
            this.unsent.push({
                type: "delete",
                id: id
            })
            if (removeMarks) {
                this.removeCommentMarks(id)
            }
            this.mustSend()
        }
    }

    addLocalAnswer(id, answer, local) {
        if (this.comments[id]) {
            if (!this.comments[id].answers) {
                this.comments[id].answers = []
            }
            this.comments[id].answers.push(answer)
        }

        if (local || (!this.mod.layout.isCurrentlyEditing())) {
            this.mod.layout.layoutComments()
        }
    }

    addAnswer(id, answer) {
        answer.id = randomID()
        this.addLocalAnswer(id, answer, true)
        this.unsent.push({
            type: "add_answer",
            id,
            answerId: answer.id
        })
        this.mustSend()
    }

    deleteLocalAnswer(id, answerId, local) {
        if (this.comments[id] && this.comments[id].answers) {
            this.comments[id].answers = this.comments[id].answers.filter(
                answer => answer.id !== answerId)
        }
        if (local || (!this.mod.layout.isCurrentlyEditing())) {
            this.mod.layout.layoutComments()
        }
    }

    deleteAnswer(id, answerId) {
        this.deleteLocalAnswer(id, answerId, true)
        this.unsent.push({
            type: "delete_answer",
            id,
            answerId
        })
        this.mustSend()
    }

    updateLocalAnswer(id, answerId, answerText, local) {
        if (this.comments[id] && this.comments[id].answers) {
            let answer = this.comments[id].answers.find(answer => answer.id ===
                answerId)
            if (answer) {
                answer.answer = answerText
            }
        }
        if (local || (!this.mod.layout.isCurrentlyEditing())) {
            this.mod.layout.layoutComments()
        }
    }

    updateAnswer(id, answerId, answerText) {
        this.updateLocalAnswer(id, answerId, answerText, true)
        this.unsent.push({
            type: "update_answer",
            id,
            answerId
        })
        this.mustSend()
    }

    unsentEvents() {
        let result = []
        for (let i = 0; i < this.unsent.length; i++) {
            let event = this.unsent[i]
            if (event.type == "delete") {
                result.push({
                    type: "delete",
                    id: event.id
                })
            } else if (event.type == "update") {
                let found = this.comments[event.id]
                if (found && found.id) {
                    result.push({
                        type: "update",
                        id: found.id,
                        comment: found.comment,
                        isMajor: found.isMajor
                    })
                } else {
                    result.push({
                        type: "ignore"
                    })
                }
            } else if (event.type == "create") {
                let found = this.comments[event.id]
                if (found && found.id) {
                    result.push({
                        type: "create",
                        id: found.id,
                        user: found.user,
                        username: found.username,
                        date: found.date,
                        comment: found.comment,
                        answers: found.answers,
                        isMajor: found.isMajor
                    })
                } else {
                    result.push({
                        type: "ignore"
                    })
                }
            } else if (event.type == "add_answer") {
                let found = this.comments[event.id],
                    foundAnswer
                if (found && found.id && found.answers) {
                    foundAnswer = found.answers.find(answer => answer.id ===
                        event.answerId)
                }
                if (foundAnswer) {
                    result.push({
                        type: "add_answer",
                        answerId: foundAnswer.id,
                        id: event.id,
                        user: foundAnswer.user,
                        username: foundAnswer.username,
                        date: foundAnswer.date,
                        answer: foundAnswer.answer
                    })
                } else {
                    result.push({
                        type: "ignore"
                    })
                }
            } else if (event.type == "delete_answer") {
                let found = this.comments[event.id]
                if (found && found.id && found.answers) {
                    result.push({
                        type: "delete_answer",
                        id: event.id,
                        answerId: event.answerId
                    })
                } else {
                    result.push({
                        type: "ignore"
                    })
                }
            } else if (event.type == "update_answer") {
                let found = this.comments[event.id],
                    foundAnswer
                if (found && found.id && found.answers) {
                    foundAnswer = found.answers.find(answer => answer.id ===
                        event.answerId)
                }
                if (foundAnswer) {
                    result.push({
                        type: "update_answer",
                        id: event.id,
                        answerId: event.answerId,
                        answer: foundAnswer.answer
                    })
                } else {
                    result.push({
                        type: "ignore"
                    })
                }
            }
        }
        return result
    }

    eventsSent(n) {
        this.unsent = this.unsent.slice(n.length)
    }

    receive(events) {
        events.forEach(event => {
            if (event.type == "delete") {
                this.deleteLocalComment(event.id, false)
            } else if (event.type == "create") {
                this.addLocalComment(event, false)
            } else if (event.type == "update") {
                this.updateLocalComment(event, false)
            } else if (event.type == "add_answer") {
                this.addLocalAnswer(event.id, event, false)
            } else if (event.type == "delete_answer") {
                this.deleteLocalAnswer(event.id, event.answerId,
                    false)
            } else if (event.type == "update_answer") {
                this.updateLocalAnswer(event.id, event.answerId,
                    event.answer, false)
            }
        })

    }

}

function randomID() {
    return Math.floor(Math.random() * 0xffffffff)
}
