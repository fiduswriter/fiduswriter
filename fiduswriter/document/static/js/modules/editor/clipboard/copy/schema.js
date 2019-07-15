// A slight modification of the document schema for the purpose of copying.
import {Schema} from "prosemirror-model"

import {fnSchema} from "../../../schema/footnotes"
import {citation} from "../../../schema/common"

const copyCitation = Object.assign({}, citation)

copyCitation.toDOM = function(node) {
    const bibDB = node.type.schema.cached.bibDB,
        bibs = {}
        node.attrs.references.forEach(ref => bibs[ref.id] = bibDB.db[ref.id])
    return ["span", {
        class: 'citation',
        'data-format': node.attrs.format,
        'data-references': JSON.stringify(node.attrs.references),
        'data-bibs': JSON.stringify(bibs)
    }]
}

export const createDocCopySchema = docSchema => new Schema({
    marks: docSchema.spec.marks,
    nodes: docSchema.spec.nodes.update('citation', copyCitation)
})

export const fnCopySchema = new Schema({
    marks: fnSchema.spec.marks,
    nodes: fnSchema.spec.nodes.update('citation', copyCitation)
})
