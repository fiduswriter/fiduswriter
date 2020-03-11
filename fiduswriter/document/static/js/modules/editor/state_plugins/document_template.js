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
        tr.setMeta('deleteUnusedSection', true)
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
                    // TOCs have node views defined in toc_render.
                }

                const protectedRanges = [
                    {from: 0, to: 1} // article node
                ]
                state.doc.firstChild.forEach((node, pos) => {
                    const from = pos + 1 // + 1 to get inside the article node
                    let to = from + 1 // + 1 for the part node
                    if (node.attrs.locking==='fixed') {
                        to = from + node.nodeSize
                    } else if (node.attrs.locking==='header') { // only relevant for tables
                        to = from + 1 + 1 + 1 + node.firstChild.firstChild.nodeSize // + 1 for the part node + 1 for the table + 1 for the first row
                    } else if (node.attrs.locking==='start') {
                        let initialFragment = Fragment.fromJSON(options.editor.schema, node.attrs.initial)
                        let protectionSize = initialFragment.size
                        if (initialFragment.lastChild && initialFragment.lastChild.isTextblock) {
                            protectionSize -= 1 // We allow writing at the end of the last text block.
                            if (initialFragment.lastChild.nodeSize === 2) {
                                // The last text block is empty, so we remove all protection from it, even node type
                                protectionSize -= 1
                            }
                            initialFragment = initialFragment.cut(0, protectionSize)

                        }
                        if (
                            node.content.size >= protectionSize &&
                            initialFragment.eq(
                                node.slice(0, protectionSize).content
                            )
                        ) {
                            // We only add protection if the start of the current content corresponds to the
                            // initial content. This may not be the case if the template has been changed.
                            to = from + 1 + protectionSize // + 1 for inside the part node
                        }
                    }
                    protectedRanges.push({from, to})
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
                tr.getMeta('deleteUnusedSection') ||
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

            let allowedElements = false, allowedMarks = false

            changingRanges.forEach(range => state.doc.nodesBetween(range.from, range.to, (node, pos, parent, _index) => {
                if (parent===tr.doc.firstChild) {
                    allowedElements = node.attrs.elements ?
                        node.attrs.elements.concat('table_row', 'table_cell', 'table_header', 'list_item', 'text') :
                        false
                    allowedMarks = node.attrs.marks ?
                        node.attrs.marks.concat('insertion', 'deletion', 'comment', 'anchor') :
                        false
                    return allowed
                }
                if (pos < range.from) {
                    return true
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
