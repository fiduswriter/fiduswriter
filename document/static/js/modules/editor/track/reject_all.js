import {Mapping, AddMarkStep, RemoveMarkStep} from "prosemirror-transform"

import {deactivateAllSelectedChanges} from "../state_plugins"

import {deleteNode} from "./delete"

export const rejectAll = function(view) {
    const tr = view.state.tr.setMeta('track', true), map = new Mapping()
    view.state.doc.descendants((node, pos) => {
        let deletedNode = false
        if (
            node.attrs.track && node.attrs.track.find(track => track.type==='insertion') ||
            node.marks && node.marks.find(mark => mark.type.name==='insertion' && !mark.attrs.approved)
        ) {
            deleteNode(tr, node, pos, map, false)
            deletedNode = true
        } else if (node.attrs.track && node.attrs.track.find(track => track.type==='deletion')) {
            const track = node.attrs.track.filter(track=> track.type !== 'deletion')
            tr.setNodeMarkup(map.map(pos), null, Object.assign({}, node.attrs, {track}), node.marks)
        } else if (node.marks && node.marks.find(mark => mark.type.name==='deletion')) {
            tr.removeMark(
                map.map(pos),
                map.map(pos+node.nodeSize),
                view.state.schema.marks.deletion
            )
        }
        const formatChangeMark = node.marks.find(mark => mark.type.name==='format_change')

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
        if (!node.isInline && !deletedNode && node.attrs.track) {
            const blockChangeTrack = node.attrs.track.find(track => track.type === 'block_change')
            if (blockChangeTrack) {
                const track = node.attrs.track.filter(track => track !== blockChangeTrack)
                tr.setNodeMarkup(
                    map.map(pos),
                    view.state.schema.nodes[blockChangeTrack.before.type],
                    Object.assign({}, node.attrs, blockChangeTrack.before.attrs, {track}),
                    node.marks
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
