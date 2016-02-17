import {ModCommentStore} from "./store"
import {ModCommentLayout} from "./layout"
import {ModCommentInteractions} from "./interactions"

export class ModComments {
  constructor(pm, version) {
    pm.mod.comments = this
    this.pm = pm
    new ModCommentStore(this, version)
    new ModCommentLayout(this)
    new ModCommentInteractions(this)
  }
}
