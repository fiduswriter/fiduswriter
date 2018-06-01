import {findTarget} from "../../common"
import {setSelectedChanges, deactivateAllSelectedChanges} from "../state_plugins"

import {reject} from "./reject"
import {rejectAll} from "./reject_all"
import {accept} from "./accept"
import {acceptAll} from "./accept_all"


// Helper functions related to tracked changes
export class ModTrack {
    constructor(editor) {
        editor.mod.track = this
        this.editor = editor
        this.bindEvents()
    }

    bindEvents() {
        // Bind all the click events related to track changes
        document.addEventListener('click', event => {
            let el = {}
            switch (true) {
                case findTarget(event, '.track-accept', el):
                    accept(el.target.dataset.type, parseInt(el.target.dataset.pos), el.target.dataset.view==='main' ? this.editor.view : this.editor.mod.footnotes.fnEditor.view)
                    break
                case findTarget(event, '.track-reject', el):
                    reject(el.target.dataset.type, parseInt(el.target.dataset.pos), el.target.dataset.view==='main' ? this.editor.view : this.editor.mod.footnotes.fnEditor.view)
                    break
                case findTarget(event, '.margin-box.track.inactive', el):
                    this.editor.mod.comments.interactions.deactivateAll()
                    let view = el.target.dataset.view === 'main' ? this.editor.view : this.editor.mod.footnotes.fnEditor.view
                    let otherView = el.target.dataset.view === 'main' ? this.editor.mod.footnotes.fnEditor.view : this.editor.view
                    // remove all selected changes in other view
                    otherView.dispatch(deactivateAllSelectedChanges(otherView.state.tr))
                    // activate selected change in relevant view
                    let tr = setSelectedChanges(
                        view.state.tr,
                        el.target.dataset.type,
                        parseInt(el.target.dataset.pos)
                    )
                    if (tr) {
                        this.editor.currentView = view
                        view.dispatch(tr)
                    }
                    break
                default:
                    break
            }
        })
    }

    rejectAll() {
        rejectAll(this.editor.mod.footnotes.fnEditor.view)
        rejectAll(this.editor.view)
    }


    acceptAll() {
        acceptAll(this.editor.mod.footnotes.fnEditor.view)
        acceptAll(this.editor.view)
    }


}
