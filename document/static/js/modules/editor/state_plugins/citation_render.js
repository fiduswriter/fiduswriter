import {Plugin, PluginKey} from "prosemirror-state"
import {ReplaceStep, ReplaceAroundStep} from "prosemirror-transform"
const key = new PluginKey('citationRender')

export const citationRenderPlugin = function(options) {
    return new Plugin({
        key,
        state: {
            init() {
                return {reset: false}
            },
            apply(tr, prev, oldState, state) {
                const meta = tr.getMeta(key)
                if (meta) {
                    // There has been an update, return values from meta instead
                    // of previous values
                    return meta
                }
                let {reset} = this.getState(oldState)

                if (reset) {
                    return {reset} // We already need to reset the bibliography. Don't bother checking for more reasons to do so.
                }

                tr.steps.forEach((step, index) => {
                    if (step instanceof ReplaceStep || step instanceof ReplaceAroundStep) {
                        if (step.from !== step.to) {
                            tr.docs[index].nodesBetween(
                                step.from,
                                step.to,
                                (node, pos, parent) => {
                                    if (node.type.name === 'citation') {
                                        // A citation was replaced. We need to reset
                                        reset = true
                                    }
                                }
                            )
                        }
                    }
                })

                return {reset}

            }
        },
        view(view) {
            options.editor.mod.citations.resetCitations()
            return {
                update: (view, prevState) => {
                    const {reset} = key.getState(view.state)
                    if (reset) {
                        options.editor.mod.citations.resetCitations()
                        const tr = view.state.tr.setMeta(key, {reset: false})
                        view.dispatch(tr)
                    } else {
                        options.editor.mod.citations.layoutCitations()
                    }
                },
                destroy: () => {
                    options.editor.mod.citations.resetCitations()
                }
            }
        }
    })
}
