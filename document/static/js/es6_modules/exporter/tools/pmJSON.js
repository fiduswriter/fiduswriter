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
