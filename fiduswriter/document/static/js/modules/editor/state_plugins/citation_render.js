import {Plugin, PluginKey} from "prosemirror-state"
import {ReplaceStep, ReplaceAroundStep} from "prosemirror-transform"
import {
    FIG_CATS, FIGURE, TABLE, PHOTO
} from "../../schema/i18n"

const key = new PluginKey('citationRender')

export const citationRenderPlugin = function(options) {
    return new Plugin({
        key,
        state: {
            init() {
                return {action: false}
            },
            apply(tr, prev, oldState, _state) {
                const meta = tr.getMeta(key)
                if (meta) {
                    // There has been an update, return values from meta instead
                    // of previous values
                    return meta
                }
                let {action} = this.getState(oldState)

                if (action) {
                    return {action} // We already need to reset the bibliography. Don't bother checking for more reasons to do so.
                }

                tr.steps.forEach((step, index) => {
                    if (step instanceof ReplaceStep || step instanceof ReplaceAroundStep) {
                        if (step.from !== step.to) {
                            tr.docs[index].nodesBetween(
                                step.from,
                                step.to,
                                node => {
                                    if (node.type.name === 'citation') {
                                        // A citation was replaced. We need to reset
                                        action = 'reset'
                                    } else if (!action && node.type.name === 'footnote') {
                                        action = 'numbers'
                                    }
                                }
                            )
                        }
                        if (step.slice && step.slice.content) {
                            step.slice.content.descendants(node => {
                                if (node.type.name === 'citation') {
                                    // A citation was added. We need to reset
                                    action = 'reset'
                                } else if (!action && node.type.name === 'footnote') {
                                    action = 'numbers'
                                }
                            })
                        }
                    }
                })

                return {action}

            }
        },
        view(_view) {
            options.editor.mod.citations.resetCitations()
            //console.log(" language :- ", options.editor.view.state.doc.firstChild.attrs.language)
           // let user_language = options.editor.view.state.doc.firstChild.attrs.language
           // Array.from(document.querySelectorAll('*[class^="figure-cat-"] ')).forEach(el => el.innerHTML = FIG_CATS[el.dataset.figureCategory][user_language])
            //console.log("aaa ", document.querySelectorAll('.figure-title'))
            return {
                update: (view, _prevState) => {
                  //  let user_language = options.editor.view.state.doc.firstChild.attrs.language
                   // Array.from(document.querySelectorAll('*[class^="figure-cat-"] ')).forEach(el => el.innerHTML = FIG_CATS[el.dataset.figureCategory][user_language])
                    //console.log("aaa ", Array.from(document.querySelectorAll('*[class^="figure-cat-"] ')) )
                    const {action} = key.getState(view.state)
                    if (action==='reset') {
                        options.editor.mod.citations.resetCitations()
                        const tr = view.state.tr.setMeta(key, {action: false})
                        view.dispatch(tr)
                    } else if (action==='numbers') {
                        options.editor.mod.citations.footnoteNumberOverride()
                        const tr = view.state.tr.setMeta(key, {action: false})
                        view.dispatch(tr)
                    }
                },
                destroy: () => {
                    options.editor.mod.citations.resetCitations()
                }
            }
        }
    })
}
