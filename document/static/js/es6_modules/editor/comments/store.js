/*
Functions related to the editing and sharing of comments.
based on https://github.com/ProseMirror/website/blob/master/src/client/collab/comment.js
*/
import {eventMixin} from "prosemirror/dist/util/event"
import {Transform} from "prosemirror/dist/transform"
import {Comment} from "./comment"

export class ModCommentStore {
    constructor(mod) {
        mod.store = this
        this.mod = mod
        this.commentDuringCreation = false // a comment object for a comment that is still udner construction
        this.setVersion(0)
    }

    setVersion(version) {
        this.version = version
        this.comments = Object.create(null)
        this.unsent = []
    }
    // Create a new temporary comment. This one is not going into the store yet,
    // as it is empty, shouldn't be shared and if canceled, it should go away
    // entirely.
    addCommentDuringCreation() {
        let id = -1
        this.commentDuringCreation = {
            comment: new Comment(
                id,
                this.mod.editor.user.id,
                this.mod.editor.user.name,
                this.mod.editor.user.avatar,
                new Date().getTime(),
                ''),
            referrer: this.mod.editor.pm.markRange(
                this.mod.editor.pm.selection.from,
                this.mod.editor.pm.selection.to,
                {className: 'active-comment'}
            )
        }
    }

    removeCommentDuringCreation() {
        if (this.commentDuringCreation) {
            this.mod.editor.pm.removeRange(this.commentDuringCreation.referrer)
            this.commentDuringCreation = false
        }
    }

    // Add a new comment to the comment database both remotely and locally.
    addComment(user, userName, userAvatar, date, comment, isMajor, posFrom, posTo) {
        let id = randomID()
        this.addLocalComment(id, user, userName, userAvatar, date, comment, [], isMajor)
        this.unsent.push({
            type: "create",
            id: id
        })
        let markType = this.mod.editor.pm.schema.marks.comment.create({id})
        this.mod.editor.pm.tr.addMark(posFrom, posTo, markType).apply()
        this.signal("mustSend")
    }

    addLocalComment(id, user, userName, userAvatar, date, comment, answers, isMajor) {
        if (!this.comments[id]) {
            this.comments[id] = new Comment(id, user, userName, userAvatar, date, comment, answers, isMajor)
        }
        this.mod.layout.layoutComments()
    }

    updateComment(id, comment, commentIsMajor) {
        this.updateLocalComment(id, comment, commentIsMajor)
        this.unsent.push({
            type: "update",
            id: id
        })
        this.signal("mustSend")
    }

    updateLocalComment(id, comment, commentIsMajor) {
        if (this.comments[id]) {
            this.comments[id].comment = comment
            this.comments[id]['review:isMajor'] = commentIsMajor
        }
        this.mod.layout.layoutComments()
    }

    removeCommentMarks(id) {
        this.mod.editor.pm.doc.descendants((node, pos, parent) => {
            let nodeStart = pos
            let nodeEnd = pos + node.nodeSize
            for (let i =0; i < node.marks.length; i++) {
                let mark = node.marks[i]
                if (mark.type.name === 'comment' && parseInt(mark.attrs.id) === id) {
                    let markType = this.mod.editor.pm.schema.marks.comment.create({id})
                    this.mod.editor.pm.apply(
                        this.mod.editor.pm.tr.removeMark(nodeStart, nodeEnd, markType)
                    )
                }
            }
        })
    }

    deleteLocalComment(id) {
        let found = this.comments[id]
        if (found) {
            delete this.comments[id]
            return true
        }
        this.mod.layout.layoutComments()
    }

    // Removes the comment from store, optionally also removes marks from document.
    deleteComment(id, removeMarks) {
        if (this.deleteLocalComment(id)) {
            this.unsent.push({
                type: "delete",
                id: id
            })
            if (removeMarks) {
                this.removeCommentMarks(id)
            }
            this.signal("mustSend")
        }
    }

    checkAndDelete(ids) {
        let that = this
        // Check if there is still a node referring to the comment IDs that were in the deleted content.
        this.mod.editor.pm.doc.descendants(function(node, pos, parent) {
            if (!node.isInline) {
                return
            }
            let id = that.mod.layout.findCommentId(node)
            if (id && ids.indexOf(id) !== -1) {
                ids.splice(ids.indexOf(id),1)
            }
        })
        // Remove all the comments that could not be found.
        ids.forEach(function(id) {
            that.deleteComment(id, false) // Delete comment from store
        })
    }


    addLocalAnswer(id, answer) {
        if (this.comments[id]) {
            if (!this.comments[id].answers) {
                this.comments[id].answers = []
            }
            this.comments[id].answers.push(answer)
        }
        this.mod.layout.layoutComments()
    }

    addAnswer(id, answer) {
        answer.id = randomID()
        this.addLocalAnswer(id, answer)
        this.unsent.push({
            type: "add_answer",
            id: id,
            answerId: answer.id
        })
        this.signal("mustSend")
    }

    deleteLocalAnswer(commentId, answerId) {
        if (this.comments[commentId] && this.comments[commentId].answers) {
            this.comments[commentId].answers = _.reject(this.comments[commentId].answers, function(answer) {
                return answer.id === answerId
            })
        }
        this.mod.layout.layoutComments()
    }

    deleteAnswer(commentId, answerId) {
        this.deleteLocalAnswer(commentId, answerId)
        this.unsent.push({
            type: "delete_answer",
            commentId: commentId,
            answerId: answerId
        })
        this.signal("mustSend")
    }

    updateLocalAnswer(commentId, answerId, answerText) {
        if (this.comments[commentId] && this.comments[commentId].answers) {
            let answer = _.findWhere(this.comments[commentId].answers, {
                id: answerId
            })
            answer.answer = answerText
        }
        this.mod.layout.layoutComments()
    }

    updateAnswer(commentId, answerId, answerText) {
        this.updateLocalAnswer(commentId, answerId, answerText)
        this.unsent.push({
            type: "update_answer",
            commentId: commentId,
            answerId: answerId
        })
        this.signal("mustSend")
    }

    hasUnsentEvents() {
        return this.unsent.length
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
                if (!found || !found.id) continue
                result.push({
                    type: "update",
                    id: found.id,
                    comment: found.comment,
                    'review:isMajor': found['review:isMajor']
                })
            } else if (event.type == "create") {
                let found = this.comments[event.id]
                if (!found || !found.id) continue
                result.push({
                    type: "create",
                    id: found.id,
                    user: found.user,
                    userName: found.userName,
                    userAvatar: found.userAvatar,
                    date: found.date,
                    comment: found.comment,
                    answers: found.answers,
                    'review:isMajor': found['review:isMajor']
                })
            } else if (event.type == "add_answer") {
                let found = this.comments[event.id]
                if (!found || !found.id || !found.answers) continue
                let foundAnswer = _.findWhere(found.answers, {
                    id: event.answerId
                })
                result.push({
                    type: "add_answer",
                    id: foundAnswer.id,
                    commentId: foundAnswer.commentId,
                    user: foundAnswer.user,
                    userName: foundAnswer.userName,
                    userAvatar: foundAnswer.userAvatar,
                    date: foundAnswer.date,
                    answer: foundAnswer.answer
                })
            } else if (event.type == "delete_answer") {
                result.push({
                    type: "delete_answer",
                    commentId: event.commentId,
                    id: event.answerId
                })
            } else if (event.type == "update_answer") {
                let found = this.comments[event.commentId]
                if (!found || !found.id || !found.answers) continue
                let foundAnswer = _.findWhere(found.answers, {
                    id: event.answerId
                })
                result.push({
                    type: "update_answer",
                    id: foundAnswer.id,
                    commentId: foundAnswer.commentId,
                    answer: foundAnswer.answer
                })
            }
        }
        return result
    }

    eventsSent(n) {
        this.unsent = this.unsent.slice(n)
        this.version += n
    }

    receive(events, version) {
        events.forEach(event => {
            if (event.type == "delete") {
                this.deleteLocalComment(event.id)
            } else if (event.type == "create") {
                this.addLocalComment(event.id, event.user, event.userName, event.userAvatar, event.date, event.comment, [], event['review:isMajor'])
            } else if (event.type == "update") {
                this.updateLocalComment(event.id, event.comment, event['review:isMajor'])
            } else if (event.type == "add_answer") {
                this.addLocalAnswer(event.commentId, event)
            } else if (event.type == "remove_answer") {
                this.deleteLocalAnswer(event.commentId, event)
            } else if (event.type == "update_answer") {
                this.updateLocalAnswer(event.commentId, event.id, event.answer)
            }
            this.version++
        })

    }

}

eventMixin(ModCommentStore)

function randomID() {
    return Math.floor(Math.random() * 0xffffffff)
}
