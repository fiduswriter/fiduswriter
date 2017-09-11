import {Plugin, PluginKey} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"

const key = new PluginKey('comments')

export let addCommentDuringCreationDecoration = function(state) {
    let decos = DecorationSet.empty
    if (!state.selection.from || state.selection.from === state.selection.to) {
        return
    }

    let deco = Decoration.inline(state.selection.from, state.selection.to, {class: 'active-comment'})
    decos = decos.add(state.doc, [deco])

    let transaction = state.tr.setMeta(key, {decos})
    return transaction
}

export let removeCommentDuringCreationDecoration = function(state) {
    let {
        decos
    } = key.getState(state)

    if (decos.find().length === 0) {
        return
    }
    decos = DecorationSet.empty

    let transaction = state.tr.setMeta(key, {decos})
    return transaction

}

export let getCommentDuringCreationDecoration = function(state) {
    let {
        decos
    } = key.getState(state)

    return decos.find()[0]
}

export let commentsPlugin = function(options) {
    return new Plugin({
        key,
        state: {
            init() {
                return {
                    decos: DecorationSet.empty,
                }
            },
            apply(tr, prev, oldState, state) {
                let meta = tr.getMeta(key)
                if (meta) {
                    // There has been an update, return values from meta instead
                    // of previous values
                    return meta
                }
                let {
                    decos
                } = this.getState(oldState)

                decos = decos.map(tr.mapping, tr.doc, {onRemove: decoSpec => {
                    // comment text has been deleted, cancel comment creation.
                    options.editor.mod.comments.interactions.deleteComment(-1)
                }})


                return {
                    decos
                }
            }
        },
        props: {
            decorations(state) {
				let {
					decos
				} = this.getState(state)
				return decos
			}
        }
    })
}
