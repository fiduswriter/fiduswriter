import {Plugin, PluginKey} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"
import {AddMarkStep} from "prosemirror-transform"

const key = new PluginKey('comments')


let moveComment = function(doc, id, pos) {
    // The content to which a comment was linked has been removed.
    // We need to find text close to the position to which we can link
    // comment. This is user for reviewer comments that should not be lost.
    if (!pos) {
        // The position is linked to the start of the document. The minimum start
        // position is 2
        pos = 2
    }
    let posFrom = pos-1
    let posTo = pos
    // We move backward through the document, trying to pick a start position
    // the depth is 1 between document parts, and comments should be moved
    // across these.
    // We decrease the from position until there is some text between posFrom
    // and posTo or until we hit the start of the document part.
    while (
        doc.resolve(posFrom).depth > 1 &&
        !doc.textBetween(posFrom, posTo).length &&
        posFrom
    ) {
        posFrom--
    }
    // If we ended up reaching a document part boundary rather than finding
    // text, we try again, this time moving in the opposite direction.
    // We start at the original position and then increase posTo
    if (doc.resolve(posFrom).depth === 1){
        posFrom = posTo
        posTo++
        while (
            doc.resolve(posTo).depth > 1 &&
            !doc.textBetween(posFrom, posTo).length
        ) {
            posTo++
        }

        // If also the increase of posTo only made us reach a document part
        // boundary, it means all text has been removed in this document part.
        // Try placing it on the first letter of the title and otherwise give up.
        if (doc.resolve(posTo).depth === 1) {
            if (doc.textBetween(2, 3).length) {
                posFrom = 2
                posTo = 3
            } else {
                return
            }
        }
    }
    let markType = doc.type.schema.marks.comment.create({id})
    return new AddMarkStep(posFrom, posTo, markType)
}

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
        appendTransaction: (transactions, oldState, state) => {
            // Check if any of the transactions are local.
            if (transactions.every(transaction => transaction.getMeta(
                    'remote'))) {
                // All transactions are remote. Give up.
                return
            }

            let deletedComments = {}
                // Check what area is affected

            transactions.forEach(transaction => {
                Object.keys(deletedComments).forEach(commentId => {
                    // map positions from earlier transactions
                    deletedComments[commentId] = transaction.mapping.map(deletedComments[commentId])
                })
                transaction.steps.forEach((step, index) => {
                    if (step.jsonID === 'replace' || step.jsonID === 'replaceAround') {
                        if (step.from !== step.to) {
                            transaction.docs[index].nodesBetween(
                                step.from,
                                step.to,
                                (node, pos, parent) => {
                                    node.marks.filter(
                                        mark => mark.type.name === 'comment' && mark.attrs.id
                                    ).map(mark => mark.attrs.id).forEach(commentId => {
                                        if (!deletedComments.hasOwnProperty(commentId)) {
                                            deletedComments[commentId] = step.from
                                        }
                                    })
                                }
                            )
                        }
                    }
                })
            })
            if (!Object.keys(deletedComments).length) {
                return
            }

            // We try to see if the deleted comments are still to be found in
            // another part of the document.
            state.doc.descendants((node, pos, parent) => {
                if (!node.isInline) {
                    return
                }

                node.marks.filter(
                    mark => mark.type.name === 'comment' && mark.attrs.id
                ).map(mark => mark.attrs.id).forEach(commentId => {
                    if (deletedComments.hasOwnProperty(commentId)) {
                        delete deletedComments[commentId]
                    }
                })
            })
            if (!Object.keys(deletedComments).length) {
                return
            }
            let steps = [], tr = state.tr
            Object.entries(deletedComments).forEach(([id, pos]) => {
                steps.push(moveComment(state.doc, id, pos))
            })
            if (!steps.every(step => step)) {
                // At least one comment was placed in a part where it couldn't be put,
                // and additionally it could not be put in the title either because it
                // had no content.
                // Add an empty space to the title, increase all positions, by 1, then
                // try again.
                tr = state.tr.insertText(' ', 2)
                state = tr.state
                steps = []
                Object.entries(deletedComments).forEach(([id, pos]) => {
                    pos++
                    steps.push(moveComment(tr.doc, id, pos))
                })
                // If the step still is not working. give up. This should never happen.
                steps = steps.filter(step => step)
            }
            steps.forEach(step => tr.step(step))
            return tr
        },
        view(editorState) {
            return {
                update: (view, prevState) => {
                    options.editor.mod.comments.layout.view()
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
