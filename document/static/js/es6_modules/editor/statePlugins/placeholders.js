import {Plugin, PluginKey} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"

const key = new PluginKey('placeholders')
export let placeholdersPlugin = function(options) {

    function calculatePlaceHolderDecorations(articleNode, selectedPart) {

        const placeHolderTexts = [
            gettext('Title...'),
            gettext('Subtitle...'),
            options.editor.docInfo.access_rights === 'write' ? false : gettext('Authors...'),
            gettext('Abstract...'),
            options.editor.docInfo.access_rights === 'write' ? false : gettext('Keywords...'),
            gettext('Body...')
        ]

        let decorations = []

        articleNode.forEach((partElement, offset, index) => {
            if (
                (partElement.isTextblock && partElement.nodeSize === 2) ||
                (!partElement.isTextblock && partElement.nodeSize === 4)
            ) {
                let text = placeHolderTexts[index]
                if (!text) {
                    return
                }
                let placeHolder = document.createElement('span')
                placeHolder.classList.add('placeholder')
                placeHolder.setAttribute('data-placeholder', text)
                if (selectedPart===partElement) {
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

        return decorations

    }

    return new Plugin({
        key,
        props: {
            decorations(state) {
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
                let currentPart = anchorPart === headPart ? anchorPart : false
                let articleNode = state.doc.firstChild
                let decorations = calculatePlaceHolderDecorations(articleNode, currentPart)

                if (decorations.length) {
                    return DecorationSet.create(state.doc, decorations)
                }
            }
        }
    })
}
