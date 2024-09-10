export const createXMLNode = function(xmlCode) {
    const div = document.createElement("div")
    div.innerHTML = xmlCode.trim()
    return div.firstChild
}