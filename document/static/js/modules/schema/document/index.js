import OrderedMap from "orderedmap"
import {Schema} from "prosemirror-model"
import {
    spec
} from "./static"
import {
    createArticle
} from "./dynamic"

export const createDocSchema = (docTemplate) => {
    console.log({docTemplate})
    const articleContent = docTemplate.map(part => part.id).join(' ')

    const article = createArticle(articleContent, docTemplate)

    const nodes = OrderedMap.from({
        article
    })
    spec.nodes = spec.nodes.append(nodes)
    return new Schema(spec)
}
