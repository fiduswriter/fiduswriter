import {Schema} from "prosemirror-model"
import {EditorState, Plugin, PluginKey, TextSelection} from "prosemirror-state"
import {EditorView, Decoration, DecorationSet} from "prosemirror-view"
import {history, redo, undo} from "prosemirror-history"
import {keymap} from "prosemirror-keymap"


const key = new PluginKey('tableMenu')

const doc = {content: 'tableMenu'},
    tableMenu = {
        content: 'inline*',
        parseDOM: [{table: ''}],
        toDOM() {
            return ["div", {
                class: ''
            }, 0]
        }
    },
    text = {group: 'inline'}

const schema = new Schema({
    nodes: {doc, tableMenu, text},
    marks: {}
})


const placeholderPlugin = function(nodeTitle) {
    return new Plugin({
        props: {
            decorations: (state) => {
                const doc = state.doc
                if (
                    doc.childCount === 1 &&
                    doc.firstChild.isTextblock &&
                    doc.firstChild.content.size === 0
                ) {
                    const placeHolder = document.createElement('span')
                    placeHolder.classList.add('placeholder')
                    // There is only one field, so we know the selection is there
                    placeHolder.classList.add('selected')
                    placeHolder.setAttribute(
                        'data-placeholder',
                        `${gettext('Add')} ${nodeTitle.toLowerCase()}...`
                    )
                    return DecorationSet.create(doc, [Decoration.widget(1, placeHolder)])
                }
            }
        }
    })
}

const pastePlugin = view => {

    const submitTags = tags => {
        const eState = view.state,
            {decos} = key.getState(eState),
            deco = decos.find()[0],
            pos = deco.from,
            nodes = tags.map(tag => eState.schema.nodes.tag.create({tag}))
        view.dispatch(
            view.state.tr.insert(pos, nodes)
        )
    }


    return new Plugin({
        props: {
            transformPastedHTML: inHTML => {
                const dom = document.createElement('div')
                dom.innerHTML = inHTML
                const tags = dom.innerText.split(/[,;]+/).filter(tag => tag.length)
                if (tags.length) {
                    const lastTag = tags.pop()
                    submitTags(tags)
                    return lastTag
                } else {
                    return inHTML
                }
            },
            transformPastedText: inText => {
                const tags = inText.split(/[,;]+/).filter(tag => tag.length)
                if (tags.length) {
                    const lastTag = tags.pop()
                    submitTags(tags)
                    return lastTag
                } else {
                    return inText
                }
            }
        }
    })
}

const submitTag = (tagState, dispatch, tagInputView, view, getPos) => {
    const tag = tagState.doc.textContent
    if (tag.length) {
        const eState = view.state,
            startPos = getPos(),
            pos = startPos + view.state.doc.nodeAt(startPos).nodeSize - 1,
            node = eState.schema.nodes.tag.create({tag})
        view.dispatch(
            view.state.tr.insert(pos, node)
        )
        tagInputView.dispatch(
            tagState.tr.delete(1, tagState.doc.nodeSize - 3)
        )
    }
    return true
}


const createTagInputEditor = (view, getPos, node) => {
    const dom = document.createElement('div')
    dom.classList.add('tag')
    dom.setAttribute('contenteditable', false)
    const tagInputView = new EditorView(dom, {
        state: EditorState.create({
            schema,
            doc: schema.nodeFromJSON({
                type: 'doc',
                content:[{
                    type: 'tableMenu',
                    content: []
                }]
            }),
            plugins: [
                
            ]
        }),
        handleDOMEvents: {
        },
        dispatchTransaction: tr => {
            const newState = tagInputView.state.apply(tr)
            tagInputView.updateState(newState)
        }
    })
    return [dom, tagInputView]
}



export class TableView {
    constructor(node, view, getPos) {
        this.node = node
        this.view = view
        this.getPos = getPos
        this.dom = document.createElement('div')
        this.dom.insertAdjacentHTML(
            'beforeend',
            `<button class="fw-button fw-light">${gettext('Add')}...</button>`
        )
         
    }

    stopEvent(event) {
        return true
    }

    ignoreMutation(record) {
        return true
    }


}

export const tableMenuPlugin = function(options) {
    return new Plugin({
        key,
        state: {
            init(config, state) {
                if (options.editor.docInfo.access_rights === 'write') {
                    this.spec.props.nodeViews['table'] =
                        (node, view, getPos) => new TableView(node, view, getPos)
                }

                return {}
            },
            apply(tr, prev) {
                return prev
            }
        },
        props: {
            nodeViews: {}
        }
    })
}
