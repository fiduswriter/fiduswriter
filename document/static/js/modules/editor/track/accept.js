import {Mapping} from "prosemirror-transform"
import {AddMarkStep, RemoveMarkStep} from "prosemirror-transform"

import {deactivateAllSelectedChanges} from "../state_plugins"

import {deleteNode} from "./delete"

export let accept = function(type, pos, view) {
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
            deleteNode(tr, node, nodePos, map, true)
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
        } else if (type==='block_change') {
            let track = node.attrs.track.filter(track => track.type !== 'block_change')
            tr.setNodeMarkup(map.map(nodePos), null, Object.assign({}, node.attrs, {track}), node.marks)
        }
        return true
    })

    deactivateAllSelectedChanges(tr)

    if (tr.steps.length) {
        view.dispatch(tr)
    }
}
