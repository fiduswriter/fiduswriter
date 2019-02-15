import {Plugin, PluginKey} from "prosemirror-state"
import {Fragment} from "prosemirror-model"

export function addDeletedPartWidget(dom, view, getPos) {
    dom.classList.add('article-deleted')
    dom.insertAdjacentHTML(
        'beforeend',
        '<div class="remove-article-part"><i class="fa fa-trash-alt"></i></div>'
    )
    const removeButton = dom.lastElementChild
    removeButton.addEventListener('click', () => {
        const from = getPos(),
            to = from + view.state.doc.nodeAt(from).nodeSize,
            tr = view.state.tr
        tr.delete(from, to)
        tr.setMeta('filterFree', true)
        view.dispatch(tr)
    })
}

export class PartView {
    constructor(node, view, getPos) {
        this.node = node
        this.view = view
        this.getPos = getPos
        this.dom = document.createElement('div')
        this.dom.classList.add('article-part')
        this.dom.classList.add(`article-${this.node.type.name}`)
        this.dom.classList.add(`article-${this.node.attrs.id}`)
        if (node.attrs.hidden) {
            this.dom.dataset.hidden = true
        }
        if (node.attrs.deleted) {
            this.contentDOM = this.dom.appendChild(document.createElement('div'))
            addDeletedPartWidget(this.dom, view, getPos)
        } else {
            this.contentDOM = this.dom
        }
    }

    stopEvent() {
        return false
    }
}

const key = new PluginKey('documentTemplate')
export const documentTemplatePlugin = function(options) {
    return new Plugin({
        key,
        state: {
            init(config, state) {
                if (options.editor.docInfo.access_rights === 'write') {
                    this.spec.props.nodeViews['richtext_part'] = (node, view, getPos) => new PartView(
                        node,
                        view,
                        getPos
                    )
                    this.spec.props.nodeViews['heading_part'] = (node, view, getPos) => new PartView(
                        node,
                        view,
                        getPos
                    )
                    this.spec.props.nodeViews['table_part'] = (node, view, getPos) => new PartView(
                        node,
                        view,
                        getPos
                    )
                    // Tags and Contributors have node views defined in tag_input and contributor_input.
                }

                const protectedRanges = []
                state.doc.firstChild.forEach((node, pos) => {
                    if (node.attrs.locking==='fixed') {
                        protectedRanges.push({
                            from: pos + 1, // + 1 to get inside the article node
                            to: pos + 1 + node.nodeSize
                        })
                    } else if (node.attrs.locking==='header') { // only relevant for tables
                        protectedRanges.push({
                            from: pos + 1 + 1 + 1 + 1 , // + 1 to get inside the article node + 1 for the part node + 1 for the table + 1 for the first row
                            to: pos + 1 + 1 + 1 + 1 + node.firstChild.firstChild.nodeSize
                        })
                    } else if (node.attrs.locking==='start') {
                        let initialFragment = Fragment.fromJSON(options.editor.schema, node.attrs.initial)
                        let protectionSize = initialFragment.size
                        if (initialFragment.lastChild.isTextblock) {
                            protectionSize -= 1 // We allow writing at the end of the last text block.
                            if (initialFragment.lastChild.nodeSize === 2) {
                                // The last text block is empty, so we remove all protection from it, even node type
                                protectionSize -= 1
                            }
                            initialFragment = initialFragment.cut(0, protectionSize)

                        }
                        if (
                            node.nodeSize >= protectionSize &&
                            initialFragment.eq(
                                node.slice(0, protectionSize).content
                            )
                        ) {
                            // We only add protection if the start of the current content corresponds to the
                            // initial content. This may not be the case if the template has been changed.
                            protectedRanges.push({
                                from: pos + 1 + 1, // + 1 to get inside the article node + 1 for inside the part node
                                to: pos + 1 + 1 + protectionSize
                            })
                        }
                    }
                })

                return {
                    protectedRanges
                }
            },
            apply(tr, prev, oldState, _state) {
                let {
                    protectedRanges
                } = this.getState(oldState)
                protectedRanges = protectedRanges.map(marker => ({
                    from: tr.mapping.map(marker.from, 1),
                    to: tr.mapping.map(marker.to, -1)
                }))
                return {
                    protectedRanges
                }
            }
        },
        props: {
            nodeViews: {}
        },
        filterTransaction: (tr, state) => {
            if (
                !tr.docChanged ||
                tr.getMeta('fixIds') ||
                tr.getMeta('remote') ||
                tr.getMeta('track') ||
                tr.getMeta('fromFootnote') ||
                tr.getMeta('filterFree') ||
                tr.getMeta('settings') ||
                ['historyUndo', 'historyRedo'].includes(tr.getMeta('inputType'))
            ) {
                return true
            }
            if (state.doc.firstChild.childCount !== tr.doc.firstChild.childCount) {
                return false
            }
            const {
                protectedRanges
            } = key.getState(state)
            let allowed = true

            let changingRanges = []

            // We map all changes back to the document before changes have been applied.
            tr.mapping.maps.slice().reverse().forEach(map => {
                if (changingRanges.length) {
                    const mapInv = map.invert()
                    changingRanges = changingRanges.map(range => (
                        {start: mapInv.map(range.start, -1), end: mapInv.map(range.end, 1)}
                    ))
                }
                map.forEach((start, end) => {
                    changingRanges.push({start, end})
                })
            })

            changingRanges.forEach(({start, end}) => {
                if (protectedRanges.find(({from, to}) => !(
                    (start <= from && end <= from) ||
                    (start >= to && end >= to)
                ))) {
                    allowed = false
                }

            })

            let ranges = []

            tr.steps.forEach((step, index) => {
                ranges.push({from: step.from, to: step.to})
                ranges = ranges.map(range => ({from: tr.mapping.maps[index].map(range.from, -1), to: tr.mapping.maps[index].map(range.to, 1)}))
            })
            let allowedElements = false, allowedMarks = false

            ranges.forEach(range => tr.doc.nodesBetween(range.from, range.to, (node, pos, parent, index) => {
                if (parent===tr.doc.firstChild) {
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
                    }
                    allowedElements = node.attrs.elements ? node.attrs.elements.concat('table_row', 'table_cell', 'table_header', 'list_item', 'text') : false
                    allowedMarks = node.attrs.marks ? node.attrs.marks.concat('insertion', 'deletion', 'comment') : false
                    return allowed
                }
                if (pos < range.from) {
                    return true
                }
                if (node === tr.doc.firstChild) {
                    // block some settings changes
                    const oldNode = state.doc.firstChild
                    if (
                        oldNode.attrs.footnote_marks !== node.attrs.footnote_marks ||
                        oldNode.attrs.footnote_elements !== node.attrs.footnote_elements ||
                        oldNode.attrs.languages !== node.attrs.languages ||
                        oldNode.attrs.papersizes !== node.attrs.papersizes ||
                        oldNode.attrs.template !== node.attrs.template ||
                        !node.attrs.papersizes.includes(node.attrs.papersize) ||
                        !node.attrs.languages.includes(node.attrs.language)
                    ) {
                        allowed = false
                    }
                    return allowed
                }
                if (
                    allowedElements &&
                    !allowedElements.includes(node.type.name)
                ) {
                    allowed = false
                } else if (allowedMarks) {
                    node.marks.forEach(mark => {
                        if (!allowedMarks.includes(mark.type.name)) {
                            allowed = false
                        }
                    })
                }

            }))

            return allowed
        }
    })
}
