import OrderedMap from "orderedmap"
import {Schema} from "prosemirror-model"
import {
    spec
} from "./static"
import {
    articleSpec,
    partSpec
} from "./dynamic"

const createPartSpec = part => {
    let spec
    switch (part.type) {
        case 'richtext':
            return partSpec(part, `(${part.elements.split(' ').join(' | ')})+`)
        case 'heading':
            return partSpec(part, 'heading')
        case 'contributors':
            spec = partSpec(part, 'contributor*')
            spec.item_title = part.item_title
            return spec
        case 'tags':
            spec = partSpec(part, 'tag*')
            spec.item_title = part.item_title
            return spec
        case 'table':
            return partSpec(part, 'table')
        default:
            return false
    }
}

export const createDocSchema = (docTemplate) => {
    const articleContent = docTemplate.map(part => part.id).join(' ')
    const article = articleSpec(articleContent, docTemplate)
    const specParts = {article}
    docTemplate.forEach(part => {
        specParts[part.id] = createPartSpec(part)
    })


    const nodes = OrderedMap.from(specParts)
    spec.nodes = spec.nodes.append(nodes)
    return new Schema(spec)
}
