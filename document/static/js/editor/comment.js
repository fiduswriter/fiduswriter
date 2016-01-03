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
  constructor(text, id, range) {
    this.id = id
    this.text = text
    this.range = range
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

  createComment(text) {
    let id = randomID()
    let sel = this.pm.selection
    this.addComment(sel.from, sel.to, text, id)
    this.unsent.push({type: "create", id: id})
    this.signal("mustSend")
  }

  addComment(from, to, text, id) {
    if (!this.comments[id]) {
      let range = this.pm.markRange(from, to, {className: "comment", id: id})
      range.on("removed", () => this.removeComment(id))
      this.comments[id] = new Comment(text, id, range)
    }
  }

  addJSONComment(obj) {
    this.addComment(Pos.fromJSON(obj.from), Pos.fromJSON(obj.to), obj.text, obj.id)
  }

  removeComment(id) {
    let found = this.comments[id]
    if (found) {
      this.pm.removeRange(found.range)
      delete this.comments[id]
      return true
    }
  }

  deleteComment(id) {
    if (this.removeComment(id)) {
      this.unsent.push({type: "delete", id: id})
      this.signal("mustSend")
    }
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
      } else { // "create"
        let found = this.comments[event.id]
        if (!found || !found.range.from) continue
        result.push({type: "create",
                     from: found.range.from,
                     to: found.range.to,
                     id: found.id,
                     text: found.text})
      }
    }
    return result
  }

  eventsSent(n) {
    this.unsent = this.unsent.slice(n)
  }

  receive(events, version) {
    events.forEach(event => {
      if (event.type == "delete")
        this.removeComment(event.id)
      else // "create"
        this.addJSONComment(event)
    })
    this.version = version
  }

  findCommentsAt(pos) {
    let found = []
    for (let id in this.comments) {
      let comment = this.comments[id]
      if (comment.range.from.cmp(pos) < 0 && comment.range.to.cmp(pos) > 0)
        found.push(comment)
    }
    return found
  }
}

eventMixin(CommentStore)

function randomID() {
  return Math.floor(Math.random() * 0xffffffff)
}

// Inline menu item

defineCommand({
  name: "annotate",
  label: "Add annotation",
  select(pm) { return pm.mod.comments && !pm.selection.empty },
  run(pm, text) {
    pm.mod.comments.createComment(text)
  },
  params: [
    {name: "Annotation text", type: "text"}
  ],
  menuGroup: "inline", menuRank: 99,
  icon: {
    width: 1024, height: 1024,
    path: "M512 219q-116 0-218 39t-161 107-59 145q0 64 40 122t115 100l49 28-15 54q-13 52-40 98 86-36 157-97l24-21 32 3q39 4 74 4 116 0 218-39t161-107 59-145-59-145-161-107-218-39zM1024 512q0 99-68 183t-186 133-257 48q-40 0-82-4-113 100-262 138-28 8-65 12h-2q-8 0-15-6t-9-15v-0q-1-2-0-6t1-5 2-5l3-5t4-4 4-5q4-4 17-19t19-21 17-22 18-29 15-33 14-43q-89-50-141-125t-51-160q0-99 68-183t186-133 257-48 257 48 186 133 68 183z"
  }
})

// Comment UI

export class CommentUI {
  constructor(pm) {
    this.pm = pm
    pm.mod.commentUI = this
    this.update = new MenuUpdate(pm, "selectionChange change blur focus", () => this.prepareUpdate())
    this.tooltip = new Tooltip(pm, "below")
    this.highlighting = null
    this.displaying = null
  }

  prepareUpdate() {
    let sel = this.pm.selection, comments
    if (!this.pm.mod.comments || !sel.empty || !this.pm.hasFocus() ||
        (comments = this.pm.mod.comments.findCommentsAt(sel.head)).length == 0) {
      return () => {
        this.tooltip.close()
        this.clearHighlight()
        this.displaying = null
      }
    } else {
      let id = comments.map(c => c.id).join(" ")
      if (id != this.displaying) {
        this.displaying = id
        let coords = bottomCenterOfSelection()
        return () => this.tooltip.open(this.renderComments(comments), coords)
      }
    }
  }

  highlightComment(comment) {
    this.clearHighlight()
    this.highlighting = this.pm.markRange(comment.range.from, comment.range.to,
                                          {className: "currentComment"})
  }

  clearHighlight() {
    if (this.highlighting) {
      this.pm.removeRange(this.highlighting)
      this.highlighting = null
    }
  }

  renderComment(comment) {
    let btn = elt("button", {class: "commentDelete", title: "Delete annotation"}, "×")
    btn.addEventListener("click", () => {
      this.clearHighlight()
      this.pm.mod.comments.deleteComment(comment.id)
      this.update()
    })
    let li = elt("li", {class: "commentText"}, comment.text, btn)
    li.addEventListener("mouseover", e => {
      if (!li.contains(e.relatedTarget)) this.highlightComment(comment)
    })
    li.addEventListener("mouseout", e => {
      if (!li.contains(e.relatedTarget)) this.clearHighlight()
    })
    return li
  }

  renderComments(comments) {
    let rendered = comments.map(c => this.renderComment(c))
    return elt("ul", {class: "commentList"}, rendered)
  }
}

function bottomCenterOfSelection() {
  let rects = window.getSelection().getRangeAt(0).getClientRects()
  let {left, right, bottom} = rects[rects.length - 1]
  return {top: bottom, left: (left + right) / 2}
}


window.CommentStore = CommentStore;
