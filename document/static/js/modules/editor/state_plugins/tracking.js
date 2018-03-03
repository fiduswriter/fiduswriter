import {Plugin, PluginKey} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"
import {ChangeSet} from "prosemirror-changeset"
import {DOMSerializer} from "prosemirror-model"
const key = new PluginKey('tracking')

export let trackingPlugin = function(options) {
    return new Plugin({
        key,
        state: {
            init(config, state) {
                let changes = ChangeSet.create(
                    state.doc,
                    {
                        compare: (a, b) => (a.u === b.u && b.t - a.t < 10000), // Allow for up to ten seconds time difference
                        combine: (a, b) => a // combine using the older time
                    }
                )
                return {
                    changes,
                    decos: DecorationSet.empty
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
                    changes,
                    decos
                } = this.getState(oldState)
                if (tr.steps.length) {
                    changes = changes.addSteps(tr.doc, tr.mapping.maps, {u: options.editor.user.id, t: Date.now()})
                    decos = DecorationSet.empty
                    changes.inserted.forEach(insertion => {
                        let colorId = options.editor.mod.collab.getColorId(insertion.data.u)
                        let deco = Decoration.inline(insertion.from, insertion.to, {
                            class: `insertion user-${colorId}`
                        }, insertion.data)
                        decos = decos.add(state.doc, [deco])
                    })
                    changes.deleted.forEach(deletion => {
                        let colorId = options.editor.mod.collab.getColorId(deletion.data.u)
                        let serializer = DOMSerializer.fromSchema(state.schema)
                        let dom = document.createElement('span')
                        dom.setAttribute('class', `deletion user-${colorId}`)
                        dom.appendChild(serializer.serializeFragment(deletion.slice.content))
                        let deco = Decoration.widget(deletion.pos, dom, {
                            side: 1,
                            u: deletion.data.u,
                            t: deletion.data.t
                        })
                        decos = decos.add(state.doc, [deco])
                    })
                }
                return {
                    changes,
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
