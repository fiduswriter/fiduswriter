import katex from "katex"

export function katexRender (formula, node, options) {
    try {
        katex.render(formula, node, options)
    } catch (error) {
        if (error.name === 'ParseError') {
            node.innerHTML = gettext('Formula Error!')
        } else {
            throw error
        }
    }
}
