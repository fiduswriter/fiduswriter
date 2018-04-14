import {Mapping} from "prosemirror-transform"
import {ReplaceStep, AddMarkStep, RemoveMarkStep, Transform} from "prosemirror-transform"
import {Slice} from "prosemirror-model"

import {findTarget} from "../../common"
import {setSelectedChanges, deactivateAllSelectedChanges} from "../state_plugins"


export function acceptAllNoInsertions(doc) {
    let tr = new Transform(doc), map = new Mapping()
    doc.descendants((node, pos, parent) => {
        let deletionMark = node.marks ? node.marks.find(mark => mark.type.name==='deletion') : false,
            insertionMark = node.marks ? node.marks.find(mark => mark.type.name==='insertion') : false,
            blockBefore = node.isTextblock ? tr.doc.resolve(map.map(pos)).nodeBefore : false
        if (blockBefore && !blockBefore.isTextblock) {
            let marks = node.marks.slice().filter(mark => mark.type.name !== 'deletion')
            let insertionMark = marks.find(mark => mark.type.name === 'insertion')
            if (insertionMark) {
                insertionMark.attrs.approved = true
            }
            tr.setNodeMarkup(map.map(pos), null, node.attrs, marks)
        } else if (deletionMark) {
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
        } else if (insertionMark) {
            tr.step(
                new RemoveMarkStep(
                    map.map(pos),
                    map.map(pos+node.nodeSize),
                    insertionMark
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
            if (!trackMark.isInSet(node.marks) || (!trackMark.attrs.inline && nodePos !== pos)) {
                reachedEnd = true
                return false
            }
            // mark as approved if node text block with no previous sibling text block.
            let blockBefore = node.isTextblock ? tr.doc.resolve(map.map(nodePos)).nodeBefore : false
            if (blockBefore && !blockBefore.isTextblock) {
                let marks = node.marks.filter(mark => mark.type.name !== 'deletion')
                let insertionMark = marks.find(mark => mark.type.name === 'insertion')
                if (insertionMark) {
                    insertionMark.attrs.approved = true
                }
                tr.setNodeMarkup(map.map(pos), null, node.attrs, marks)
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
                if (node.isInline) {
                    tr.removeMark(
                        map.map(nodePos),
                        map.map(nodePos+node.nodeSize),
                        view.state.schema.marks.deletion
                    )
                } else {
                    tr.setNodeMarkup(map.map(nodePos), null, node.attrs, trackMark.removeFromSet(node.marks))
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
                let marks = node.marks.filter(mark => mark.type.name !== 'deletion')
                let insertionMark = marks.find(mark => mark.type.name === 'insertion')
                if (insertionMark) {
                    insertionMark.attrs.approved = true
                }
                tr.setNodeMarkup(map.map(pos), null, node.attrs, marks)
            } else if (node.marks && node.marks.find(mark => mark.type.name==='insertion' && !mark.attrs.approved)) {
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
            } else if (node.marks && node.marks.find(mark => mark.type.name==='deletion')) {
                if (node.isInline) {
                    tr.removeMark(
                        map.map(pos),
                        map.map(pos+node.nodeSize),
                        view.state.schema.marks.deletion
                    )
                } else {
                    tr.setNodeMarkup(map.map(pos), null, node.attrs, node.marks.filter(mark => mark.type.name!=='deletion'))
                }

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

            if (!trackMark.isInSet(node.marks) || (!trackMark.attrs.inline && nodePos !== pos)) {
                reachedEnd = true
                return false
            }

            let blockBefore = node.isTextblock ? tr.doc.resolve(map.map(nodePos)).nodeBefore : false

            if (blockBefore && !blockBefore.isTextblock) {
                // Node is a text block at the beginning of a document part or right after
                // a figure or alike. Just mark the block as accepted, no matter whether
                // it is a deletion or insertion mark.
                let marks = node.marks.slice().filter(mark => mark.type.name !== 'deletion')
                let insertionMark = marks.find(mark => mark.type.name === 'insertion')
                if (insertionMark) {
                    insertionMark.attrs.approved = true
                }
                tr.setNodeMarkup(map.map(nodePos), null, node.attrs, marks)
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
                let attrs = Object.assign({}, trackMark.attrs)
                attrs.approved = true
                if (node.isInline) {
                    tr.step(
                        new AddMarkStep(
                            map.map(nodePos),
                            map.map(nodePos+node.nodeSize),
                            view.state.schema.marks.insertion.create(attrs)
                        )
                    )
                } else {
                    tr.setNodeMarkup(map.map(nodePos), null, node.attrs, trackMark.removeFromSet(node.marks))
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
                let marks = node.marks.filter(mark => mark.type.name !== 'deletion')
                let insertionMark = marks.find(mark => mark.type.name === 'insertion')
                if (insertionMark) {
                    insertionMark.attrs.approved = true
                }
                tr.setNodeMarkup(map.map(pos), null, node.attrs, marks)
            } else if (node.marks && node.marks.find(mark => mark.type.name==='deletion')) {
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
            } else if (node.marks && node.marks.find(mark => mark.type.name==='insertion' && !mark.attrs.approved)) {
                let mark = node.marks.find(mark => mark.type.name==='insertion' && !mark.attrs.approved),
                    attrs = Object.assign({}, mark.attrs)
                attrs.approved = true
                if (node.isInline) {
                    tr.step(
                        new AddMarkStep(
                            map.map(pos),
                            map.map(pos+node.nodeSize),
                            view.state.schema.marks.insertion.create(attrs)
                        )
                    )
                } else {
                    tr.setNodeMarkup(map.map(pos), null, node.attrs, mark.removeFromSet(node.marks))
                }
            }
            return true
        })

        deactivateAllSelectedChanges(tr)

        if (tr.steps.length) {
            view.dispatch(tr)
        }
    }
}
