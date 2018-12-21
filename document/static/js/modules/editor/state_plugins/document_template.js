import {Plugin, PluginKey} from "prosemirror-state"

const key = new PluginKey('documentTemplate')
export const documentTemplatePlugin = function(options) {
    return new Plugin({
        key,
        filterTransaction: (tr, state) => {
            if (tr.getMeta('remote')) {
                return true
            }
            if (state.doc.firstChild.childCount !== tr.doc.firstChild.childCount) {
                return false
            }
            let allowed = true

            let ranges = []

            tr.steps.forEach((step, index) => {
                ranges.push({from: step.from, to: step.to})
                ranges = ranges.map(range => ({from: tr.mapping.maps[index].map(range.from, -1), to: tr.mapping.maps[index].map(range.to, 1)}))
            })
            let allowedElements = false, allowedMarks = false

            ranges.forEach(range => tr.doc.nodesBetween(range.from, range.to, (node, pos, parent, index) => {
                let partNode
                if (parent===tr.doc.firstChild) {
                    allowedElements = node.attrs.elements ? node.attrs.elements.concat('table_row', 'table_cell', 'list_item', 'text') : false
                    allowedMarks = node.attrs.marks ? node.attrs.marks.concat('insertion', 'deletion', 'comment') : false
                    partNode = true
                }
                if (pos < range.from || node === tr.doc.firstChild) {
                    return true
                }
                if (partNode) {
                    const oldNode = state.doc.firstChild.child(index)
                    if (
                        oldNode.type !== node.type ||
                        oldNode.attrs.id !== node.attrs.id ||
                        oldNode.attrs.title !== node.attrs.title ||
                        oldNode.attrs.locking !== node.attrs.locking ||
                        oldNode.attrs.language !== node.attrs.language ||
                        oldNode.attrs.elements !== node.attrs.elements ||
                        oldNode.attrs.marks !== node.attrs.marks ||
                        oldNode.attrs.language !== node.attrs.language ||
                        oldNode.attrs.item_title !== node.attrs.item_title ||
                        oldNode.attrs.optional !== node.attrs.optional ||
                        oldNode.attrs.help !== node.attrs.help
                    ) {
                        allowed = false
                    } else if (
                        node.type.name === 'part_table' &&
                        node.attrs.locking === 'rows' &&
                        node.firstChild.childCount !== oldNode.firstChild.childCount
                    ) {
                        allowed = false
                    }
                } else if (
                    allowedElements &&
                    !allowedElements.includes(node.type.name)
                ) {
                    console.log(`forbidden node ${node.type.name}`)
                    allowed = false
                } else if (allowedMarks) {
                    node.marks.forEach(mark => {
                        if (!allowedMarks.includes(mark.type.name)) {
                            console.log(`forbidden mark ${mark.type.name}`)
                            allowed = false
                        }
                    })
                }

            }))

            return allowed
        }
    })
}
