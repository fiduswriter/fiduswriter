import {Mapping, RemoveMarkStep, Transform} from "prosemirror-transform"

import {
    fnSchema
} from "../../schema/footnotes"

import {deleteNode} from "./delete"

export function acceptAllNoInsertions(doc) {
    const tr = new Transform(doc), map = new Mapping()
    doc.descendants((node, pos) => {
        const deletionTrack = node.attrs.track ?
                node.attrs.track.find(track => track.type === 'deletion') :
                node.marks.find(mark => mark.type.name === 'deletion'),
            insertionTrack = node.attrs.track ?
                node.attrs.track.find(track => track.type === 'insertion') :
                node.marks.find(mark => mark.type.name === 'insertion'),
            formatChangeMark = node.marks.find(mark => mark.type.name === 'format_change'),
            blockChangeTrack = node.attrs.track ?
                node.attrs.track.find(track => track.name === 'block_change') :
                false
        if (node.type.name === 'footnote' && node.attrs.footnote) {
            const fnDoc = fnSchema.nodeFromJSON({
                    type: "doc",
                    content: [{
                        type: "footnotecontainer",
                        content: node.attrs.footnote
                    }]
                }),
                cleanFnDoc = acceptAllNoInsertions(fnDoc),
                fnChange = !fnDoc.eq(cleanFnDoc)
            if (fnChange) {
                tr.setNodeMarkup(
                    map.map(pos),
                    null,
                    Object.assign({}, node.attrs, {
                        footnote: cleanFnDoc.firstChild.toJSON().content
                    }),
                    node.marks
                )
            }
        }
        if (deletionTrack) {
            deleteNode(tr, node, pos, map, true)
            return false
        } else if (insertionTrack) {
            if (node.isInline) {
                tr.step(
                    new RemoveMarkStep(
                        map.map(pos),
                        map.map(pos + node.nodeSize),
                        insertionTrack
                    )
                )
            } else {
                const track = node.attrs.track.filter(track => track !== insertionTrack)
                tr.setNodeMarkup(map.map(pos), null, Object.assign({}, node.attrs, {track}), node.marks)
            }
        }
        if (node.isInline && formatChangeMark) {
            tr.step(
                new RemoveMarkStep(
                    map.map(pos),
                    map.map(pos + node.nodeSize),
                    formatChangeMark
                )
            )
        }
        if (blockChangeTrack) {
            const track = node.attrs.track.filter(track => track.type !== blockChangeTrack)
            tr.setNodeMarkup(map.map(pos), null, Object.assign({}, node.attrs, {track}), node.marks)
        }
        return true
    })
    return tr.doc
}
