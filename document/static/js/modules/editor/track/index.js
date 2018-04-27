import {Mapping} from "prosemirror-transform"
import {ReplaceStep, AddMarkStep, RemoveMarkStep, Transform} from "prosemirror-transform"
import {Slice} from "prosemirror-model"

import {findTarget} from "../../common"
import {setSelectedChanges, deactivateAllSelectedChanges} from "../state_plugins"


export function acceptAllNoInsertions(doc) {
    let tr = new Transform(doc), map = new Mapping()
    doc.descendants((node, pos, parent) => {
        let deletionTrack = node.attrs.track ?
                node.attrs.track.find(track => track.name==='deletion') :
                node.marks.find(mark => mark.type.name==='deletion'),
            insertionTrack = node.attrs.track ?
                node.attrs.track.find(track => track.name==='insertion') :
                node.marks.find(mark => mark.type.name==='insertion'),
            blockBefore = node.isTextblock ? tr.doc.resolve(map.map(pos)).nodeBefore : false
        if (blockBefore && !blockBefore.isTextblock) {
            tr.setNodeMarkup(map.map(pos), null, Object.assign({}, node.attrs, {track:[]}), node.marks)
        } else if (deletionTrack) {
            let from = node.isTextblock ? pos - 1 : pos,
                to = node.isTextblock ? pos + 1 : pos + node.nodeSize,
                delStep = new ReplaceStep(
                    map.map(from),
                    map.map(to),
                    Slice.empty
                )
            tr.step(delStep)
            let stepMap = delStep.getMap()
            map.appendMap(stepMap)
        } else if (insertionTrack) {
            if (node.isInline) {
                tr.step(
                    new RemoveMarkStep(
                        map.map(pos),
                        map.map(pos+node.nodeSize),
                        insertionTrack
                    )
                )
            } else {
                tr.setNodeMarkup(map.map(pos), null, Object.assign({}, node.attrs, {track:[]}), node.marks)
            }

        }
        return true
    })
    return tr.doc
}

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
                    this.accept(el.target.dataset.type, parseInt(el.target.dataset.pos), this.editor.view)
                    break
                case findTarget(event, '.track-reject', el):
                    this.reject(el.target.dataset.type, parseInt(el.target.dataset.pos), this.editor.view)
                    break
                case findTarget(event, '.margin-box.track.inactive', el):
                    this.editor.mod.comments.interactions.deactivateAll()
                    let tr = setSelectedChanges(
                        this.editor.view.state.tr,
                        el.target.dataset.type,
                        parseInt(el.target.dataset.pos)
                    )
                    if (tr) {
                        this.editor.view.dispatch(tr)
                    }
                    break
                default:
                    break
            }
        })
    }

    reject(type, pos, view) {
        let tr = view.state.tr.setMeta('track', true), map = new Mapping(), reachedEnd = false
        let trackMark = view.state.doc.nodeAt(pos).marks.find(mark => mark.type.name===type)
        view.state.doc.nodesBetween(pos, view.state.doc.firstChild.nodeSize, (node, nodePos) => {
            if (nodePos < pos) {
                return true
            }
            if (reachedEnd) {
                return false
            }
            if (!node.isInline) {
                reachedEnd = true
            } else if (!trackMark.isInSet(node.marks) || (!trackMark.attrs.inline && nodePos !== pos)) {
                reachedEnd = true
                return false
            }
            // mark as approved if node text block with no previous sibling text block.
            let blockBefore = node.isTextblock ? tr.doc.resolve(map.map(nodePos)).nodeBefore : false
            if (blockBefore && !blockBefore.isTextblock) {
                tr.setNodeMarkup(map.map(pos), null, Object.assign({}, node.attrs, {track:[]}), node.marks)
            } else if (type==='insertion') {
                let from = node.isTextblock ? nodePos - 1 : nodePos, // if the current node and the previous node are textblocks, merge them. Otherwise delete node.
                    to = node.isTextblock ? nodePos + 1 : nodePos + node.nodeSize
                let delStep = new ReplaceStep(
                    map.map(from),
                    map.map(to),
                    Slice.empty
                )
                tr.step(delStep)
                let stepMap = delStep.getMap()
                map.appendMap(stepMap)
            } else {
                if (node.attrs.track) {
                    let track = node.attrs.track.filter(track => track.type !== 'deletion')
                    tr.setNodeMarkup(map.map(nodePos), null, Object.assign({}, node.attrs, {track}), node.marks)
                    reachedEnd = true
                } else {
                    tr.removeMark(
                        map.map(nodePos),
                        map.map(nodePos+node.nodeSize),
                        view.state.schema.marks.deletion
                    )
                }
            }
            return true
        })

        deactivateAllSelectedChanges(tr)

        if (tr.steps.length) {
            view.dispatch(tr)
        }
    }

    rejectAll() {
        this.rejectAllForView(this.editor.mod.footnotes.fnEditor.view)
        this.rejectAllForView(this.editor.view)
    }

    rejectAllForView(view) {
        let tr = view.state.tr.setMeta('track', true), map = new Mapping()
        view.state.doc.descendants((node, pos, parent) => {
            // mark as approved if node text block with no previous sibling text block.
            let blockBefore = node.isTextblock ? tr.doc.resolve(map.map(pos)).nodeBefore : false
            if (blockBefore && !blockBefore.isTextblock) {
                tr.setNodeMarkup(map.map(pos), null, Object.assign({}, node.attrs, {track:[]}), node.marks)
            } else if (node.attrs.track && node.attrs.track.find(track => track.type==='insertion')) {
                let from = node.isTextblock ? pos - 1 : pos,
                    to = node.isTextblick ? pos + 1 : pos + node.nodeSize
                let delStep = new ReplaceStep(
                    map.map(from),
                    map.map(to),
                    Slice.empty
                )
                tr.step(delStep)
                let stepMap = delStep.getMap()
                map.appendMap(stepMap)
            } else if (node.marks && node.marks.find(mark => mark.type.name==='insertion' && !mark.attrs.approved)) {
                let from = pos,
                    to = pos + node.nodeSize
                let delStep = new ReplaceStep(
                    map.map(from),
                    map.map(to),
                    Slice.empty
                )
                tr.step(delStep)
                let stepMap = delStep.getMap()
                map.appendMap(stepMap)
            } else if (node.attrs.track && node.attrs.track.find(track => track.type==='deletion')) {
                tr.setNodeMarkup(map.map(pos), null, Object.assign({}, node.attrs, {track:[]}), node.marks)
            } else if (node.marks && node.marks.find(mark => mark.type.name==='deletion')) {
                tr.removeMark(
                    map.map(pos),
                    map.map(pos+node.nodeSize),
                    view.state.schema.marks.deletion
                )
            }
            return true
        })

        deactivateAllSelectedChanges(tr)

        if (tr.steps.length) {
            view.dispatch(tr)
        }
    }

    accept(type, pos, view) {
        let tr = view.state.tr.setMeta('track', true), map = new Mapping(), reachedEnd = false
        let trackMark = view.state.doc.nodeAt(pos).marks.find(mark => mark.type.name===type)
        view.state.doc.nodesBetween(pos, view.state.doc.firstChild.nodeSize, (node, nodePos, parent, index) => {
            if (nodePos < pos) {
                return true
            }
            if (reachedEnd) {
                return false
            }
            if (!node.isInline) {
                reachedEnd = true
            } else if (!trackMark.isInSet(node.marks) || (!trackMark.attrs.inline && nodePos !== pos)) {
                reachedEnd = true
                return false
            }

            let blockBefore = node.isTextblock ? tr.doc.resolve(map.map(nodePos)).nodeBefore : false

            if (blockBefore && !blockBefore.isTextblock) {
                // Node is a text block at the beginning of a document part or right after
                // a figure or alike. Just mark the block as accepted, no matter whether
                // it is a deletion or insertion mark.
                tr.setNodeMarkup(map.map(nodePos), null, Object.assign({}, node.attrs, {track:[]}), node.marks)
            } else if (type==='deletion') {
                let from = node.isTextblock ? nodePos - 1 : nodePos, // if the current node and the previous node are textblocks, merge them. Otherwise delete node.
                    to = node.isTextblock ? nodePos + 1 : nodePos + node.nodeSize
                let delStep = new ReplaceStep(
                    map.map(from),
                    map.map(to),
                    Slice.empty
                )
                tr.step(delStep)
                let stepMap = delStep.getMap()
                map.appendMap(stepMap)
            } else {
                if (node.attrs.track) {
                    let track = node.attrs.track.filter(track => track.type !== 'insertion')
                    tr.setNodeMarkup(map.map(nodePos), null, Object.assign({}, node.attrs, {track}), node.marks)
                } else {
                    tr.step(
                        new AddMarkStep(
                            map.map(nodePos),
                            map.map(nodePos+node.nodeSize),
                            view.state.schema.marks.insertion.create(Object.assign({}, trackMark.attrs, {approved: true}))
                        )
                    )
                }
            }
            return true
        })

        deactivateAllSelectedChanges(tr)

        if (tr.steps.length) {
            view.dispatch(tr)
        }
    }

    acceptAll() {
        this.acceptAllForView(this.editor.mod.footnotes.fnEditor.view)
        this.acceptAllForView(this.editor.view)
    }

    acceptAllForView(view) {
        let tr = view.state.tr.setMeta('track', true), map = new Mapping()
        view.state.doc.descendants((node, pos, parent) => {
            // mark as approved if node text block with no previous sibling text block.
            let blockBefore = node.isTextblock ? tr.doc.resolve(map.map(pos)).nodeBefore : false
            if (blockBefore && !blockBefore.isTextblock) {
                tr.setNodeMarkup(map.map(pos), null, Object.assign({}, node.attrs, {track:[]}), node.marks)
            } else if (node.attrs.track && node.attrs.track.find(track => track.type==='deletion')) {
                let from = node.isTextblock ? pos - 1 : pos, // if the current node and the previous node are textblocks, merge them. Otherwise delete node.
                    to = node.isTextblock ? pos + 1 : pos + node.nodeSize
                let delStep = new ReplaceStep(
                    map.map(from),
                    map.map(to),
                    Slice.empty
                )
                tr.step(delStep)
                let stepMap = delStep.getMap()
                map.appendMap(stepMap)
            } else if (node.marks && node.marks.find(mark => mark.type.name==='deletion')) {
                let from = pos,
                    to = pos + node.nodeSize
                let delStep = new ReplaceStep(
                    map.map(from),
                    map.map(to),
                    Slice.empty
                )
                tr.step(delStep)
                let stepMap = delStep.getMap()
                map.appendMap(stepMap)
            } else if (node.attrs.track && node.attrs.track.find(track => track.type==='insertion')) {
                tr.setNodeMarkup(map.map(pos), null, Object.assign({}, node.attrs, {track:[]}), node.marks)
            } else if (node.marks && node.marks.find(mark => mark.type.name==='insertion' && !mark.attrs.approved)) {
                let mark = node.marks.find(mark => mark.type.name==='insertion'),
                    attrs = Object.assign({}, mark.attrs, {approved: true})
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

        deactivateAllSelectedChanges(tr)

        if (tr.steps.length) {
            view.dispatch(tr)
        }
    }
}
