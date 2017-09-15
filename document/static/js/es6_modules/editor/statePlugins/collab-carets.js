import {Plugin, PluginKey} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"
import {sendableSteps} from "prosemirror-collab"
import {REVIEW_ROLES} from ".."

const key = new PluginKey('collabCarets')

export let getSelectionUpdate = function(state) {
     let {caretUpdate} = key.getState(state)
     return caretUpdate
}

export let updateCollaboratorSelection = function(state, collaborator, data) {
    let {
        decos,
        caretPositions
    } = key.getState(state)

    let oldCarPos = caretPositions.find(carPos => carPos.sessionId === data.session_id)

    if (oldCarPos) {
        caretPositions = caretPositions.filter(carPos => carPos !== oldCarPos)
        let removeDecos = decos.find().filter(deco => deco.spec === oldCarPos.decoSpec)
        decos = decos.remove(removeDecos)
    }

    let widgetDom = document.createElement('div')
    let className = `user-${collaborator.colorId}`
    widgetDom.classList.add('caret')
    widgetDom.classList.add(className)
    widgetDom.innerHTML = '<div class="caret-head"></div>'
    widgetDom.firstChild.classList.add(className)
    let tooltip = collaborator.name
    widgetDom.title = tooltip
    widgetDom.firstChild.title = tooltip
    let decoSpec = {id: data.session_id} // We will compare the decoSpec object. Id not really needed.
    let newCarPos = {
        sessionId: data.session_id,
        userId: collaborator.id,
        decoSpec,
        anchor: data.anchor,
        head: data.head
    }
    caretPositions.push(newCarPos)

    let widgetDeco = Decoration.widget(data.head, widgetDom, decoSpec),
        addDecos = [widgetDeco]

    if (data.anchor !== data.head) {
        let from = data.head > data.anchor ? data.anchor : data.head,
            to = data.anchor > data.head ? data.anchor : data.head,
            inlineDeco = Decoration.inline(from, to, {
                class: `user-bg-${collaborator.colorId}`
            }, decoSpec)
        addDecos.push(inlineDeco)
    }
    decos = decos.add(state.doc, addDecos)

    let transaction = state.tr.setMeta(key, {
        decos,
        caretPositions,
        caretUpdate: false
    })
    return transaction
}

export let removeCollaboratorSelection = function(state, data) {
    let {
        decos,
        caretPositions
    } = key.getState(state)

    let caretPosition = caretPositions.find(carPos => carPos.sessionId === data.session_id)

    if (caretPosition) {
        caretPositions = caretPositions.filter(carPos => carPos !== caretPosition)
        let removeDecos = decos.find().filter(deco => deco.spec === caretPosition.decoSpec)
        decos = decos.remove(removeDecos)
        let transaction = state.tr.setMeta(key, {
            decos,
            caretPositions,
            caretUpdate: false
        })
        return transaction
    }
    return false
}

export let collabCaretsPlugin = function(options) {
    return new Plugin({
        key,
        state: {
            init() {
                return {
                    caretPositions: [],
                    decos: DecorationSet.empty,
                    caretUpdate: false
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
                    decos,
                    caretPositions
                } = this.getState(oldState),
                caretUpdate = false

                decos = decos.map(tr.mapping, tr.doc, {onRemove: decoSpec => {
                    caretPositions = caretPositions.filter(
                        carPos => carPos.decoSpec !== decoSpec
                    )
                }})


                if (
                    tr.selectionSet &&
                    !sendableSteps(state) &&
                    !REVIEW_ROLES.includes(options.editor.docInfo.access_rights)
                ) {
                    caretUpdate = {anchor: tr.selection.anchor, head: tr.selection.head}
                }

                return {
                    decos,
                    caretPositions,
                    caretUpdate
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
