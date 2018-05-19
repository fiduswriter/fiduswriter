import {Mapping} from "prosemirror-transform"
import {ReplaceStep, AddMarkStep, RemoveMarkStep, ReplaceAroundStep, Transform, replaceStep} from "prosemirror-transform"
import {Slice} from "prosemirror-model"
import {Selection, TextSelection, EditorState} from "prosemirror-state"
import {liftListItem} from "prosemirror-schema-list"


import {findTarget} from "../../common"
import {setSelectedChanges, deactivateAllSelectedChanges} from "../state_plugins"


function deleteNode(tr, node, nodePos, map) { // Delete a node either because a deletion has been accepted or an insertion rejected.
    let newNodePos = map.map(nodePos), delStep
    if (node.isTextblock) {
        let selectionBefore = Selection.findFrom(tr.doc.resolve(newNodePos), -1)
        if (selectionBefore instanceof TextSelection) {
            delStep = replaceStep(
                tr.doc,
                selectionBefore.$anchor.pos,
                newNodePos + 1
            )
        } else {
            // There is a block node right in front of it that cannot be removed. Give up. (table/figure/etc.)
            let track = node.attrs.track.filter(track => track.type !== 'insertion')
            tr.setNodeMarkup(newNodePos, null, Object.assign({}, node.attrs, {track}), node.marks)
        }
    } else if (node.isLeaf) {
        delStep = new ReplaceStep(
            newNodePos,
            map.map(nodePos + node.nodeSize),
            Slice.empty
        )
    } else if (node.type === tr.doc.type.schema.nodes['list_item']) {
        let state = EditorState.create({
            doc: tr.doc,
            selection: Selection.findFrom(tr.doc.resolve(newNodePos), 1)
        })
        liftListItem(node.type)(state, newTr => {
                newTr.steps.forEach(step => {
                    tr.step(step)
                    map.appendMap(step.getMap())
                })
            }
        )
    } else {
        let end = map.map(nodePos + node.nodeSize)
        delStep = new ReplaceAroundStep(
            newNodePos,
            end,
            newNodePos+1,
            end-1,
            Slice.empty,
            0,
            true
        )
    }
    if (delStep) {
        tr.step(delStep)
        let stepMap = delStep.getMap()
        map.appendMap(stepMap)
    }
}

export function acceptAllNoInsertions(doc) {
    let tr = new Transform(doc), map = new Mapping()
    doc.descendants((node, pos, parent) => {
        let deletionTrack = node.attrs.track ?
                node.attrs.track.find(track => track.name==='deletion') :
                node.marks.find(mark => mark.type.name==='deletion'),
            insertionTrack = node.attrs.track ?
                node.attrs.track.find(track => track.name==='insertion') :
                node.marks.find(mark => mark.type.name==='insertion'),
            formatChangeMark = node.marks.find(mark => mark.type.name==='format_change')

        if (deletionTrack) {
            deleteNode(tr, node, pos, map)
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
                let track = node.attrs.track.filter(track => track.type !== 'insertion')
                tr.setNodeMarkup(map.map(pos), null, Object.assign({}, node.attrs, {track}), node.marks)
            }
        }
        if (!deletionTrack && node.isInline && formatChangeMark) {
            tr.step(
                new RemoveMarkStep(
                    map.map(pos),
                    map.map(pos+node.nodeSize),
                    formatChangeMark
                )
            )
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
                    this.accept(el.target.dataset.type, parseInt(el.target.dataset.pos), el.target.dataset.view==='main' ? this.editor.view : this.editor.mod.footnotes.fnEditor.view)
                    break
                case findTarget(event, '.track-reject', el):
                    this.reject(el.target.dataset.type, parseInt(el.target.dataset.pos), el.target.dataset.view==='main' ? this.editor.view : this.editor.mod.footnotes.fnEditor.view)
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
            if (type==='insertion') {
                deleteNode(tr, node, nodePos, map)
            } else if (type==='deletion') {
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
            } else if (type==='format_change') {
                trackMark.attrs.before.forEach(oldMark =>
                    tr.step(
                        new AddMarkStep(
                            map.map(nodePos),
                            map.map(nodePos+node.nodeSize),
                            view.state.schema.marks[oldMark].create()
                        )
                    )
                )
                trackMark.attrs.after.forEach(newMark => {
                    tr.step(
                        new RemoveMarkStep(
                            map.map(nodePos),
                            map.map(nodePos+node.nodeSize),
                            node.marks.find(mark => mark.type.name===newMark)
                        )
                    )
                })
                tr.step(
                    new RemoveMarkStep(
                        map.map(nodePos),
                        map.map(nodePos+node.nodeSize),
                        trackMark
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

    rejectAll() {
        this.rejectAllForView(this.editor.mod.footnotes.fnEditor.view)
        this.rejectAllForView(this.editor.view)
    }

    rejectAllForView(view) {
        let tr = view.state.tr.setMeta('track', true), map = new Mapping()
        view.state.doc.descendants((node, pos, parent) => {
            let deletedNode = false
            if (
                node.attrs.track && node.attrs.track.find(track => track.type==='insertion') ||
                node.marks && node.marks.find(mark => mark.type.name==='insertion' && !mark.attrs.approved)
            ) {
                deleteNode(tr, node, pos, map)
                deletedNode = true
            } else if (node.attrs.track && node.attrs.track.find(track => track.type==='deletion')) {
                let track = node.attrs.track.filter(track=> track.type !== 'deletion')
                tr.setNodeMarkup(map.map(pos), null, Object.assign({}, node.attrs, {track}), node.marks)
            } else if (node.marks && node.marks.find(mark => mark.type.name==='deletion')) {
                tr.removeMark(
                    map.map(pos),
                    map.map(pos+node.nodeSize),
                    view.state.schema.marks.deletion
                )
            }
            let formatChangeMark = node.marks.find(mark => mark.type.name==='format_change')

            if (
                node.isInline &&
                !deletedNode &&
                formatChangeMark
            ) {
                formatChangeMark.attrs.before.forEach(oldMark =>
                    tr.step(
                        new AddMarkStep(
                            map.map(pos),
                            map.map(pos+node.nodeSize),
                            view.state.schema.marks[oldMark].create()
                        )
                    )
                )
                formatChangeMark.attrs.after.forEach(newMark => {
                    tr.step(
                        new RemoveMarkStep(
                            map.map(pos),
                            map.map(pos+node.nodeSize),
                            node.marks.find(mark => mark.type.name===newMark)
                        )
                    )
                })

                tr.step(
                    new RemoveMarkStep(
                        map.map(pos),
                        map.map(pos+node.nodeSize),
                        formatChangeMark
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
            } else if (!trackMark.isInSet(node.marks)) {
                reachedEnd = true
                return false
            }

            if (type==='deletion') {
                deleteNode(tr, node, nodePos, map)
            } else if (type==='insertion') {
                if (node.attrs.track) {
                    let track = node.attrs.track.filter(track => track.type !== 'insertion')
                    if (node.attrs.track.length === track) {
                        return true
                    }
                    tr.setNodeMarkup(map.map(nodePos), null, Object.assign({}, node.attrs, {track}), node.marks)
                    // Special case: first paragraph in list item by same user -- will also be accepted.
                    if (node.type.name === 'list_item' && node.child(0) && node.child(0).type.name === 'paragraph') {
                        reachedEnd = false
                    }
                } else {
                    tr.step(
                        new AddMarkStep(
                            map.map(nodePos),
                            map.map(nodePos+node.nodeSize),
                            view.state.schema.marks.insertion.create(Object.assign({}, trackMark.attrs, {approved: true}))
                        )
                    )
                }
            } else if (type==='format_change') {
                tr.step(
                    new RemoveMarkStep(
                        map.map(nodePos),
                        map.map(nodePos+node.nodeSize),
                        trackMark
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

    acceptAll() {
        this.acceptAllForView(this.editor.mod.footnotes.fnEditor.view)
        this.acceptAllForView(this.editor.view)
    }

    acceptAllForView(view) {
        let tr = view.state.tr.setMeta('track', true), map = new Mapping()
        view.state.doc.descendants((node, pos, parent) => {
            let deletedNode = false
            if (
                node.attrs.track && node.attrs.track.find(track => track.type==='deletion') ||
                node.marks && node.marks.find(mark => mark.type.name==='deletion')
            ) {
                deleteNode(tr, node, pos, map)
                deletedNode = true
            } else if (node.attrs.track && node.attrs.track.find(track => track.type==='insertion')) {
                let track = node.attrs.track.filter(track => track.type !== 'insertion')
                tr.setNodeMarkup(map.map(pos), null, Object.assign({}, node.attrs, {track}), node.marks)
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
            let formatChangeMark = node.marks.find(mark => mark.type.name==='format_change')
            if (
                node.isInline &&
                !deletedNode &&
                formatChangeMark
            ) {
                tr.step(
                    new RemoveMarkStep(
                        map.map(pos),
                        map.map(pos+node.nodeSize),
                        formatChangeMark
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
