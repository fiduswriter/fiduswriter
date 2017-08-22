import {Plugin, PluginKey} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"
import {ReplaceAroundStep} from "prosemirror-transform"
import {Slice, Fragment} from "prosemirror-model"
import {noSpaceTmp, addAlert} from "../../common"
import {randomHeadingId, randomFigureId} from "../../schema/common"

const key = new PluginKey('authorInput')

export let authorInputPlugin = function(options) {

    return new Plugin({
        key,
        state: {
            init(config, state) {
                let pos = 1, // enter article
                    child = 0,
                    decos = DecorationSet.empty
                while(state.doc.firstChild.child(child).type.name !== 'authors') {
                    pos += state.doc.firstChild.child(child).nodeSize
                    child++
                }
                // Put decoration at end within authors element
                pos += state.doc.firstChild.child(child).nodeSize - 1

                let dom = document.createElement('button')
                dom.setAttribute('class','fw-button fw-light fw-large')
                dom.innerHTML = gettext('Add author...')
                let deco = Decoration.widget(pos, dom, {
                        side: 1
                    })

                decos = decos.add(state.doc, [deco])

                return {
                    decos
                }
            },
            apply(tr, prev, oldState, state) {
                let {
                    decos
                } = this.getState(oldState)

                decos = decos.map(tr.mapping, tr.doc)
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
