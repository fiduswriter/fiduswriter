import {Mapping} from "prosemirror-transform"
import {ReplaceStep, AddMarkStep} from "prosemirror-transform"
import {Slice} from "prosemirror-model"

import {findTarget} from "../../common"
import {setSelectedChanges} from "../state_plugins"


// Helper functions related to tracked changes
export class ModToolsTrack {
    constructor(mod) {
        mod.track = this
        this.mod = mod
        this.bindEvents()
    }

    bindEvents() {
        // Bind all the click events related to track changes
        document.addEventListener('click', event => {
            let el = {}
            switch (true) {
                case findTarget(event, '.track-accept', el):
                    this.accept(el.target.dataset.type, parseInt(el.target.dataset.pos), this.mod.editor.view)
                    break
                case findTarget(event, '.track-reject', el):
                    this.reject(el.target.dataset.type, parseInt(el.target.dataset.pos), this.mod.editor.view)
                    break
                case findTarget(event, '.margin-box.track.inactive', el):
                    this.mod.editor.mod.comments.interactions.deactivateAll()
                    let tr = setSelectedChanges(
                            this.mod.editor.view.state,
                            el.target.dataset.type,
                            parseInt(el.target.dataset.pos)
                        )
                    if (tr) {
                        this.mod.editor.view.dispatch(tr)
                    }
                    break
                default:
                    break
            }
        })
    }

    reject(type, pos, view) {
        let tr = view.state.tr.setMeta('track', true), map = new Mapping(), reachedEnd = false, user = false, date = false
        view.state.doc.nodesBetween(pos, view.state.doc.firstChild.nodeSize, (node, nodePos) => {
            if (nodePos < pos) {
                return true
            }
            if (reachedEnd) {
                return false
            }
            let trackMark = node.marks.find(mark => mark.type.name===type)
            if (!trackMark || trackMark.type.name === 'insertion' && trackMark.attrs.approved) {
                reachedEnd = true
                return false
            } else if (!user) {
                user = trackMark.attrs.user
                date = trackMark.attrs.date
            } else if (user !== trackMark.attrs.user || date !== trackMark.attrs.date){
                reachedEnd = true
                return false
            }
            if (type==='insertion') {
                let delStep = new ReplaceStep(
                    map.map(nodePos),
                    map.map(nodePos+node.nodeSize),
                    Slice.empty
                )
                tr.step(delStep)
                let stepMap = delStep.getMap()
                map.appendMap(stepMap)
            } else {
                tr.removeMark(
                    map.map(nodePos),
                    map.map(nodePos+node.nodeSize),
                    view.state.schema.marks.deletion
                )
            }
            return true
        })
        if (tr.steps.length) {
            view.dispatch(tr)
        }
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

    accept(type, pos, view) {
        let tr = view.state.tr.setMeta('track', true), map = new Mapping(), reachedEnd = false, user = false, date = false
        view.state.doc.nodesBetween(pos, view.state.doc.firstChild.nodeSize, (node, nodePos) => {
            if (nodePos < pos) {
                return true
            }
            if (reachedEnd) {
                return false
            }
            let trackMark = node.marks.find(mark => mark.type.name===type)
            if (!trackMark || trackMark.type.name === 'insertion' && trackMark.attrs.approved) {
                reachedEnd = true
                return false
            } else if (!user) {
                user = trackMark.attrs.user
                date = trackMark.attrs.date
            } else if (user !== trackMark.attrs.user || date !== trackMark.attrs.date){
                reachedEnd = true
                return false
            }
            if (type==='deletion') {
                let delStep = new ReplaceStep(
                    map.map(nodePos),
                    map.map(nodePos+node.nodeSize),
                    Slice.empty
                )
                tr.step(delStep)
                let stepMap = delStep.getMap()
                map.appendMap(stepMap)
            } else {
                let attrs = Object.assign({}, trackMark.attrs)
                attrs.approved = true
                tr.step(
                    new AddMarkStep(
                        map.map(nodePos),
                        map.map(nodePos+node.nodeSize),
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
