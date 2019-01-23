import {Plugin, PluginKey} from "prosemirror-state"


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
            init(_config, _state) {
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

                return {}
            },
            apply(tr, prev) {
                return prev
            }
        },
        props: {
            nodeViews: {}
        },
        filterTransaction: (tr, state) => {
            if (
                !tr.steps.length ||
                tr.getMeta('fixIds') ||
                tr.getMeta('remote') ||
                tr.getMeta('track') ||
                tr.getMeta('fromFootnote') ||
                tr.getMeta('filterFree') ||
                tr.getMeta('untracked') ||
                ['historyUndo', 'historyRedo'].includes(tr.getMeta('inputType'))
            ) {
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
                if (parent===tr.doc.firstChild) {
                    allowedElements = node.attrs.elements ? node.attrs.elements.concat('table_row', 'table_cell', 'table_header', 'list_item', 'text') : false
                    allowedMarks = node.attrs.marks ? node.attrs.marks.concat('insertion', 'deletion', 'comment') : false
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
                        node.type.name === 'table_part' &&
                        node.attrs.locking === 'header' &&
                        !node.firstChild.firstChild.eq(oldNode.firstChild.firstChild)
                    ) {
                        allowed = false
                    }
                    return true
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
                        return false
                    } else {
                        allowed = true
                        return true
                    }
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
