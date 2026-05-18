// Mock for mathlive
export function convertLatexToMathMl(latex) {
    return `<math><mi>${latex}</mi></math>`
}

export default {
    convertLatexToMathMl
}
