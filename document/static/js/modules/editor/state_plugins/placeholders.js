import {Plugin, PluginKey} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"

const key = new PluginKey('placeholders')
export const placeholdersPlugin = function(options) {

    function calculatePlaceHolderDecorations(state) {
        const anchor = state.selection.$anchor
        const head = state.selection.$head
        if (!anchor || !head) {
            return
        }
        const anchorPart = anchor.node(2)
        const headPart = head.node(2)
        if (!anchorPart || !headPart) {
            return
        }
        const currentPart = anchorPart === headPart ? anchorPart : false
        const articleNode = state.doc.firstChild

        const placeHolderTexts = [
            gettext('Title...'),
            gettext('Subtitle...'),
            options.editor.docInfo.access_rights === 'write' ? false : gettext('Authors...'),
            gettext('Abstract...'),
            options.editor.docInfo.access_rights === 'write' ? false : gettext('Keywords...'),
            gettext('Body...')
        ]

        const decorations = []

        articleNode.forEach((partElement, offset, index) => {
            if (
                (partElement.isTextblock && partElement.nodeSize === 2) ||
                (!partElement.isTextblock && partElement.nodeSize === 4)
            ) {
                const text = placeHolderTexts[index]
                if (!text) {
                    return
                }
                const placeHolder = document.createElement('span')
                placeHolder.classList.add('placeholder')
                placeHolder.setAttribute('data-placeholder', text)
                if (currentPart===partElement) {
                    placeHolder.classList.add('selected')
                }
                let position = 2 + offset
                // position of decorator: 2 to get inside (doc (1) + article (1))
                if (!partElement.isTextblock) {
                    // In block nodes that are not text blocks (body + abstract)
                    // place inside the first child node (a paragraph).
                    position += 1
                }
                decorations.push(Decoration.widget(
                    position,
                    placeHolder,
                    {
                        side: 1
                    }
                ))
            }
        })

        return decorations.length ? DecorationSet.create(state.doc,decorations) : false

    }

    return new Plugin({
        key,
        state: {
            init(config, state) {
                return {
                    decos: calculatePlaceHolderDecorations(state)
                }
            },
            apply(tr, prev, oldState, state) {
                let {
                    decos
                } = this.getState(oldState)
                if (tr.steps.length || tr.selectionSet) {
                    decos = calculatePlaceHolderDecorations(state)
                }
                return {
                    decos
                }
            }
        },
        props: {
            decorations(state) {
                const {
                    decos
                } = this.getState(state)
                return decos
            }
        }
    })
}
