import {Mapping} from "prosemirror-transform"
import {ReplaceStep, AddMarkStep} from "prosemirror-transform"
import {Slice} from "prosemirror-model"
// Helper functions related to tracked changes
export class ModToolsTrack {
    constructor(mod) {
        mod.track = this
        this.mod = mod
    }

    rejectAll() {
        this.rejectAllForView(this.mod.editor.mod.footnotes.fnEditor.view)
        this.rejectAllForView(this.mod.editor.view)
    }

    rejectAllForView(view) {
        let tr = view.state.tr.setMeta('track', true), map = new Mapping()
        view.state.doc.descendants((node, pos, parent) => {
            if (node.marks && node.marks.find(mark => mark.type.name==='insertion' && !mark.attrs.approved)) {
                let delStep = new ReplaceStep(
                    map.map(pos),
                    map.map(pos+node.nodeSize),
                    Slice.empty
                )
                tr.step(delStep)
                let stepMap = delStep.getMap()
                map.appendMap(stepMap)
            } else if (node.marks && node.marks.find(mark => mark.type.name==='deletion')) {
                tr.removeMark(
                    map.map(pos),
                    map.map(pos+node.nodeSize),
                    view.state.schema.marks.deletion
                )
            }
            return true
        })
        if (tr.steps.length) {
            view.dispatch(tr)
        }
    }

    acceptAll() {
        this.acceptAllForView(this.mod.editor.mod.footnotes.fnEditor.view)
        this.acceptAllForView(this.mod.editor.view)
    }

    acceptAllForView(view) {
        let tr = view.state.tr.setMeta('track', true), map = new Mapping()
        view.state.doc.descendants((node, pos, parent) => {
            if (node.marks && node.marks.find(mark => mark.type.name==='deletion')) {
                let delStep = new ReplaceStep(
                    map.map(pos),
                    map.map(pos+node.nodeSize),
                    Slice.empty
                )
                tr.step(delStep)
                let stepMap = delStep.getMap()
                map.appendMap(stepMap)
            } else if (node.marks && node.marks.find(mark => mark.type.name==='insertion' && !mark.attrs.approved)) {
                let mark = node.marks.find(mark => mark.type.name==='insertion' && !mark.attrs.approved),
                    attrs = Object.assign({}, mark.attrs)
                attrs.approved = true
                tr.step(
                    new AddMarkStep(
                        map.map(pos),
                        map.map(pos+node.nodeSize),
                        view.state.schema.marks.insertion.create(attrs)
                    )
                )
            }
            return true
        })
        if (tr.steps.length) {
            view.dispatch(tr)
        }
    }
}
