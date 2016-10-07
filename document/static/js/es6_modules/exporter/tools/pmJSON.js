import {modelToEditor} from "../../schema/convert"

export let createPmJSON = function(doc) {
    let pmJSON = modelToEditor(doc).toJSON()
    // We remove those parts of the doc that are't enabled in the settings
    if (!doc.settings['metadata-subtitle']) {
        delete pmJSON.content[1].content
    }
    if (!doc.settings['metadata-authors']) {
        delete pmJSON.content[2].content
    }
    if (!doc.settings['metadata-abstract']) {
        delete pmJSON.content[3].content
    }
    if (!doc.settings['metadata-keywords']) {
        delete pmJSON.content[4].content
    }
    return pmJSON
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
