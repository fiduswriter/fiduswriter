export let escapeText = function(text) {
    return text
        .replace(/"/g, '&quot;')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
}

// descendant nodes for pmJSON
export let descendantNodes = function(node) {
    let returnValue = [node]
    if (node.content) {
        node.content.forEach(function(childNode) {
            returnValue = returnValue.concat(descendantNodes(childNode))
        })
    }
    return returnValue
}
// textcontent of all descendant nodes for pmJSON
export let textContent = function(node) {
    let returnString = ""
    descendantNodes(node).forEach(function(subNode){
        if(subNode.text){
            returnString += subNode.text
        }
    })
    return returnString
}
// all descendant text nodes for dom nodes
export let domDescendantTexNodes = function(node) {
    let returnValue = []
    let childNodes = [].slice.call(node.childNodes)
    childNodes.forEach(function(subNode){
        if (subNode.nodeType===3) {
            returnValue.push(subNode)
        } else if (subNode.nodeType===1) {
            returnValue = returnValue.concat(domDescendantTexNodes(subNode))
        }
    })
    return returnValue
}
