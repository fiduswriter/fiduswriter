import {Mapping} from "prosemirror-transform"
import {AddMarkStep, RemoveMarkStep} from "prosemirror-transform"

import {deactivateAllSelectedChanges} from "../state_plugins"

import {deleteNode} from "./delete"

export let acceptAll = function(view) {
    let tr = view.state.tr.setMeta('track', true), map = new Mapping()
    view.state.doc.descendants((node, pos, parent, index) => {
        let deletedNode = false
        if (
            node.attrs.track && node.attrs.track.find(track => track.type==='deletion') ||
            node.marks && node.marks.find(mark => mark.type.name==='deletion')
        ) {
            deleteNode(tr, node, pos, map, true)
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

        if (
            !node.isInline && !deletedNode && node.attrs.track
        ) {
            let blockChangeTrack = node.attrs.track.find(track => track.type==='block_change')
            if (blockChangeTrack) {
                let track = node.attrs.track.filter(track => track !== blockChangeTrack)
                tr.setNodeMarkup(map.map(pos), null, Object.assign({}, node.attrs, {track}), node.marks)
            }
        }

        return true
    })

    deactivateAllSelectedChanges(tr)

    if (tr.steps.length) {
        view.dispatch(tr)
    }
}
