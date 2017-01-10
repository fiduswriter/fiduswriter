// Return a json that is the same as the existing json, but with all parts
// marked as hidden removed.

export let removeHidden = function(node) {
    let keys = Object.keys(node), returnNode = {}

    keys.forEach(key => {
        if (key !== 'content') {
            returnNode[key] = node[key]
        }
    })
    if ((!node.attrs || !node.attrs.hidden) && node.content) {
        returnNode.content = []
        node.content.forEach(child => returnNode.content.push(removeHidden(child)))
    }
    return returnNode
}

export let descendantNodes = function(node) {
    let returnValue = [node]
    if (node.content) {
        node.content.forEach(childNode => {
            returnValue = returnValue.concat(descendantNodes(childNode))
        })
    }
    return returnValue
}

export let textContent = function(node) {
    let returnString = ""
    descendantNodes(node).forEach(
        subNode => {
            if(subNode.text){
                returnString += subNode.text
            }
        }
    )
    return returnString
}
