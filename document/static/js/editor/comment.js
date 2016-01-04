/*
based on https://github.com/ProseMirror/website/blob/master/src/client/collab/comment.js
*/
import {Pos} from "prosemirror/dist/model"
import {elt} from "prosemirror/dist/dom"
import {defineCommand} from "prosemirror/dist/edit"
import {eventMixin} from "prosemirror/dist/util/event"
import {MenuUpdate} from "prosemirror/dist/menu/update"

import {Tooltip} from "prosemirror/dist/menu/tooltip"

class Comment {
  constructor(id, user, userName, userAvatar, date, comment, answers) {
    this.id = id
    this.user = user
    this.userName = userName
    this.userAvatar = userAvatar
    this.date = date
    this.comment = comment
    this.answers = answers
  }
}

export class CommentStore {
  constructor(pm, version) {
    pm.mod.comments = this
    this.pm = pm
    this.comments = Object.create(null)
    this.version = version
    this.unsent = []
  }

  addComment(user, userName, userAvatar, date, comment, answers) {
    let id = randomID()
    this.addLocalComment(id, user, userName, userAvatar, date, comment, answers)
    this.unsent.push({type: "create", id: id})
    this.pm.execCommand('schema:comment:set',[id]);
//    this.signal("mustSend")
    return id
  }

  addLocalComment(id, user, userName, userAvatar, date, comment, answers) {
    if (!this.comments[id]) {
      //TODO: handle deletion somehow.
//      range.on("removed", () => this.removeComment(id))
      this.comments[id] = new Comment(id, user, userName, userAvatar, date, comment, answers)
    }
  }

  updateComment(id, comment) {
    this.updateLocalComment(id, comment)
    this.unsent.push({type: "update", id: id})
    this.signal("mustSend")
  }

  updateLocalComment(id, comment) {
    if (this.comments[id]) {
      this.comments[id].comment = comment
    }
  }



  deleteLocalComment(id) {
    let found = this.comments[id]
    if (found) {
//      this.pm.removeRange(found.range)
      // TODO: We need to remove all instances of a mark with this ID.
      delete this.comments[id]
      return true
    }
  }

  deleteComment(id) {
    if (this.deleteLocalComment(id)) {
      this.unsent.push({type: "delete", id: id})
      this.signal("mustSend")
    }
  }

  addLocalAnswer(id, answer) {
    if (this.comments[id]) {
      if(!this.comments[id].answers) {
        this.comments[id].answers = []
      }
      this.comments[id].answers.push(answer)
    }
  }

  addAnswer(id, answer) {
    answer.id = randomID()
    this.addLocalAnswer(id, answer)
    this.unsent.push({type: "add_answer", id: id, answerId: answer.id})
    this.signal("mustSend")
  }

  deleteLocalAnswer(commentId, answerId) {
    if (this.comments[commentId] && this.comments[commentId].answers) {
      this.comments[commentId].answers = _.reject(this.comments[commentId].answers, function (answer) {return answer.id===answerId})
    }
  }

  deleteAnswer(commentId, answerId) {
    this.deleteLocalAnswer(commentId, answerId)
    this.unsent.push({type: "delete_answer", commentId: commentId, answerId: answerId})
    this.signal("mustSend")
  }

  updateLocalAnswer(commentId, answerId, answerText) {
    if (this.comments[commentId] && this.comments[commentId].answers) {
      let answer = _.findWhere(this.comments[commentId].answers, {id: answerId})
      answer.answer = answerText
    }
  }

  updateAnswer(commentId, answerId, answerText) {
    this.updateLocalAnswer(commentId, answerId, answerText)
    this.unsent.push({type: "update_answer", commentId: commentId, answerId: answerId})
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
        result.push({type: "delete", id: event.id})
      } else if (event.type == "update") {
        let found = this.comments[event.id]
        if (!found || !found.id) continue
        result.push({type: "update", id: found.id, comment: found.comment})
      } else if (event.type == "create") {
        let found = this.comments[event.id]
        if (!found || !found.id) continue
        result.push({type: "create",
                     id: found.id,
                     user: found.user,
                     userName: found.userName,
                     userAvatar: found.userAvatar,
                     date: found.date,
                     comment: found.comment,
                     answers: found.answers
                     })
      } else if (event.type == "add_answer") {
        let found = this.comments[event.id]
        if (!found || !found.id || !found.answers) continue
        let foundAnswer = _.findWhere(found.answers, {id: event.answerId})
        result.push({type: "add_answer",
                     id: foundAnswer.id,
                     commentId: foundAnswer.commentId,
                     user: foundAnswer.user,
                     userName: foundAnswer.userName,
                     userAvatar: foundAnswer.userAvatar,
                     date: foundAnswer.date,
                     answer: foundAnswer.answer
                     })
      } else if (event.type == "delete_answer") {
        result.push({type: "delete_answer",
                     commentId: event.commentId,
                     id: event.answerId
                     })
      } else if (event.type == "update_answer") {
        let found = this.comments[event.commentId]
        if (!found || !found.id || !found.answers) continue
        let foundAnswer = _.findWhere(found.answers, {id: event.answerId})
        result.push({type: "update_answer", id: foundAnswer.id, commentId: foundAnswer.commentId, answer: foundAnswer.answer})
      }
    }
    return result
  }

  eventsSent(n) {
    this.unsent = this.unsent.slice(n)
    this.version += n
  }

  receive(events, version) {
    var updateCommentLayout = false
    events.forEach(event => {
      if (event.type == "delete") {
        this.deleteLocalComment(event.id)
        updateCommentLayout = true
      } else if (event.type == "create") {
        this.addLocalComment(event.id, event.user, event.userName, event.userAvatar, event.date, event.comment)
        if (event.comment.length > 0) {
          updateCommentLayout = true
        }
      } else if (event.type == "update") {
        this.updateLocalComment(event.id, event.comment)
        updateCommentLayout = true
      } else if (event.type == "add_answer") {
        this.addLocalAnswer(event.commentId, event)
        updateCommentLayout = true
      } else if (event.type == "remove_answer") {
        this.deleteLocalAnswer(event.commentId, event)
        updateCommentLayout = true
      } else if (event.type == "update_answer") {
        this.updateLocalAnswer(event.commentId, event.id, event.answer)
        updateCommentLayout = true
      }
      this.version++
    })
    if (updateCommentLayout) {
      commentHelpers.layoutComments()
    }
    //this.version = version
  }

  findCommentsAt(pos) {
    let found = [],
      node = this.pm.doc.path(pos.path)

    for (let mark in node.marks) {
      if (mark.type.name==='comment' && mark.attrs.id in this.comments)
        found.push(this.comments[mark.attrs.id])
    }
    return found
  }
}

eventMixin(CommentStore)

function randomID() {
  return Math.floor(Math.random() * 0xffffffff)
}
