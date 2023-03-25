import {descendantNodes} from "../tools/doc_content"

export const moveFootnoteComments = (topNode) => {
    // DOCX doesn't support comments in footnotes. So we copy all comment marks from footnote
    // to parent node.
    descendantNodes(topNode).forEach(
        node => {
            if (node.type === "footnote") {
                descendantNodes({type: "footnotecontainer", content: node.attrs.footnote}).forEach(fnNode => {
                    if (fnNode.marks) {
                        fnNode.marks.filter(mark => mark.type === "comment").forEach(mark => {
                            if (!node.marks) {
                                node.marks = []
                            }
                            node.marks.push(mark)
                        })
                    }
                })
            }
        }
    )

    return topNode

}
