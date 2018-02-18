import {render} from "katex/dist/katex"

export function katexRender (formula, node, options) {
    try {
        render(formula, node, options)
    } catch (error) {
        if (error.name === 'ParseError') {
            node.innerHTML = gettext('Formula Error!')
        } else {
            throw error
        }
    }
}
