// Return a json that is the same as the existing json, but with all parts
// marked as hidden removed.

export let removeHidden = function(node) {
    if (node.attrs && node.attrs.hidden === true) {
        return false
    }
    let content = []
    if (node.content) {
        node.content.forEach(function(child){
            let subNode = removeHidden(child)
            if (subNode) {
                content.push(subNode)
            }
        })
    }
    let returnNode = {
        type: node.type,
        attrs: node.attrs,
    }
    if (content.length) {
        returnNode.content = content
    }
    return returnNode
}

export let descendantNodes = function(node) {
    let returnValue = [node]
    if (node.content) {
        node.content.forEach(function(childNode) {
            returnValue = returnValue.concat(descendantNodes(childNode))
        })
    }
    return returnValue
}

export let textContent = function(node) {
    let returnString = ""
    descendantNodes(node).forEach(function(subNode){
        if(subNode.text){
            returnString += subNode.text
        }
    })
    return returnString
}
