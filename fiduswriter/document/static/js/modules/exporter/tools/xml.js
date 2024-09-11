import {XMLParser, XMLBuilder} from "fast-xml-parser"

const fastXMLParserOptions = {
    attributeNamePrefix: "",
    ignoreAttributes: false,
    allowBooleanAttributes: true,
    preserveOrder: true,
    cdataPropName: "__cdata",
    commentPropName: "#comment",
    processEntities: true,
    suppressUnpairedNode: false,
    suppressEmptyNode: true
}

const isLeaf = (tagName) => ["#text", "__cdata", "#comment"].includes(tagName)

class XMLElement {
    constructor(node, parentElement = null) {
        this.node = node
        this.parentElement = parentElement

        // Recursively wrap child elements if they exist
        const tagName = this.tagName
        if (tagName && this.node[tagName] && !isLeaf(tagName)) {
            this.node[tagName] = this.node[tagName].map(child => {
                // Only wrap objects (not text nodes)
                return typeof child === "object" ? new XMLElement(child, this) : child
            })
        }
    }

    get tagName() {
        // Get the tag name dynamically (the first key that isn't ":@")
        return Object.keys(this.node).find(key => key !== ":@")
    }

    get children() {
        // Return child elements if they exist, or an empty array if none
        return this.node[this.tagName] || []
    }

    get attributes() {
        // Return attributes stored under the ":@" key, or an empty object if not present
        return this.node[":@"] || {}
    }

    set attributes(attrs) {
        // Update the attributes object
        this.node[":@"] = attrs
    }

    get innerXML() {
        // Serialize the children back to XML
        return this.children.map(child => {
            return child.toString()
        }).join("")
    }

    set innerXML(xmlString) {
        this.node[this.tagName].forEach(child => {
            child.setParent(null)
        })
        // Clear existing children
        this.node[this.tagName] = []

        // Parse the new XML string
        const parser = new XMLParser(fastXMLParserOptions)
        const xml = parser.parse(`<${this.tagName}>${xmlString}</${this.tagName}>`)
        // Append new children
        xml[0][this.tagName].forEach(child => {
            this.appendChild(child)
        })
    }

    get textContent() {
        if (isLeaf(this.tagName)) {
            if (this.tagName === "#text") {
                return this.node[this.tagName]
            }
            return ""
        } else {
            // Serialize the children back to text
            return this.children.map(child => child.textContent).join("")
        }
    }

    get firstChild() {
        return this.children[0]
    }

    get lastChild() {
        return this.children[this.children.length - 1]
    }

    get firstElementChild() {
        return this.children.filter(child => !isLeaf(child.tagName))[0]
    }

    get lastElementChild() {
        const elements = this.children.filter(child => !isLeaf(child.tagName))
        if (elements.length === 0) {
            return null
        }
        return elements[elements.length - 1]
    }

    get nextSibling() {
        if (this.parentElement) {
            const siblings = this.parentElement.children
            const index = siblings.indexOf(this)
            if (index < siblings.length - 1) {
                return siblings[index + 1]
            }
        }
        return null
    }

    get previousSibling() {
        if (this.parentElement) {
            const siblings = this.parentElement.children
            const index = siblings.indexOf(this)
            if (index > 0) {
                return siblings[index - 1]
            }
        }
        return null
    }

    setParent(element) {
        this.parentElement = element
        return this
    }

    hasAttribute(name) {
        return name in this.attributes
    }

    getAttribute(name) {
        return this.attributes[name]
    }

    setAttribute(name, value) {
        if (isLeaf(this.tagName)) {
            return false
        }
        this.attributes[name] = value
    }

    cloneNode(deep = false, parentElement = null) {
        if (isLeaf(this.tagName)) {
            return new XMLElement({...this.node}, parentElement)
        }
        const clonedNode = {
            ":@": {...this.node[":@"]}
        }
        clonedNode[this.tagName] = []
        const clone = new XMLElement(clonedNode, parentElement)
        if (deep) {
            clonedNode[this.tagName] = this.children.map(child => child.cloneNode(deep, clone))
        }
        return clone
    }

    appendChild(newChild) {
        if (isLeaf(this.tagName)) {
            return false
        }
        if (!this.node[this.tagName]) {
            this.node[this.tagName] = []
        }
        let newChildElement
        // Wrap newChild in XMLElement if it's not already
        if (newChild instanceof XMLElement) {
            newChild.parentElement?.removeChild(newChild)
            newChildElement = newChild.setParent(this)
        } else {
            newChildElement = new XMLElement(newChild, this)
        }
        // Append newChild to the list of children under the tagName
        this.node[this.tagName].push(newChildElement)
    }

    prependChild(newChild) {
        if (isLeaf(this.tagName)) {
            return false
        }
        if (!this.node[this.tagName]) {
            this.node[this.tagName] = []
        }
        let newChildElement
        // Wrap newChild in XMLElement if it's not already
        if (newChild instanceof XMLElement) {
            newChild.parentElement?.removeChild(newChild)
            newChildElement = newChild.setParent(this)
        } else {
            newChildElement = new XMLElement(newChild, this)
        }
        // Prepend newChild to the list of children under the tagName
        this.node[this.tagName].unshift(newChildElement)
    }

    appendXML(xmlString) {
        if (isLeaf(this.tagName)) {
            return false
        }
        const parser = new XMLParser(fastXMLParserOptions)
        const xml = parser.parse(`<${this.tagName}>${xmlString}</${this.tagName}>`)
        xml[0][this.tagName].forEach(child => {
            this.appendChild(child)
        })
    }

    prependXML(xmlString) {
        if (isLeaf(this.tagName)) {
            return false
        }
        const parser = new XMLParser(fastXMLParserOptions)
        const xml = parser.parse(`<${this.tagName}>${xmlString}</${this.tagName}>`)
        xml[0][this.tagName].reverse().forEach(child => {
            this.prependChild(child)
        })
    }

    removeChild(child) {
        if (isLeaf(this.tagName)) {
            return false
        }
        if (this.node[this.tagName]) {
            const index = this.node[this.tagName].indexOf(child)
            if (index > -1) {
                this.node[this.tagName].splice(index, 1)
                child.setParent(null)
            }
        }
    }

    insertBefore(newChild, referenceChild) {
        if (isLeaf(this.tagName)) {
            return false
        }
        if (this.node[this.tagName]) {
            const index = this.node[this.tagName].indexOf(referenceChild)
            if (index > -1) {
                let newChildElement
                // Wrap newChild in XMLElement if it's not already
                if (newChild instanceof XMLElement) {
                    newChild.parentElement?.removeChild(newChild)
                    newChildElement = newChild.setParent(this)
                } else {
                    newChildElement = new XMLElement(newChild, this)
                }
                this.node[this.tagName].splice(index, 0, newChildElement)
            } else {
                // If referenceChild is not found, fallback to append
                this.appendChild(newChild)
            }
        }
    }

    query(tagName, attributes = {}) {
        return this.queryAll(tagName, attributes, 1)[0]
    }

    queryAll(tagName, attributes = {}, limit = false) {
        const result = []
        const tags = typeof tagName === "string" ? [tagName] : tagName

        function traverse(dom) {
            const currentTagName = Object.keys(dom.node).find(key => key !== ":@")
            if (tags.includes(currentTagName) && Object.keys(attributes).every(attr => dom.hasAttribute(attr) && (dom.getAttribute(attr) === attributes[attr] || attributes[attr] === null))) {
                result.push(dom)
            }
            if (limit && result.length >= limit) {
                return true
            }
            if (currentTagName && dom.node[currentTagName] && !isLeaf(currentTagName)) {
                for (const childDOM of dom.node[currentTagName]) {
                    if (traverse(childDOM)) {
                        return true
                    }
                }
            }
        }

        traverse(this)
        return result
    }

    // getElementsByTagName(tagName) {
    //     return this.getElementsByTagNames([tagName])
    // }

    // getElementByTagName(tagName) {
    //     return this.getElementsByTagName(tagName, 1)[0]
    // }

    // getElementsByTagNames(tagNames, limit = false) {
    //     const result = []

    //     function traverse(dom) {
    //         const currentTagName = Object.keys(dom.node).find(key => key !== ":@")
    //         if (tagNames.includes(currentTagName)) {
    //             result.push(dom)
    //         }
    //         if (limit && result.length >= limit) {
    //             return true
    //         }
    //         if (currentTagName && dom.node[currentTagName] && !isLeaf(currentTagName)) {
    //             for (const childDOM of dom.node[currentTagName]) {
    //                 if (traverse(childDOM)) {
    //                     return true
    //                 }
    //             }
    //         }
    //     }

    //     traverse(this)
    //     return result
    // }

    // getElementByTagNameAndAttribute(tagName, attributeName, attributeValue = null) {
    //     return this.getElementByTagNameAndAttributes(tagName, {[attributeName]: attributeValue})
    // }

    // getElementByTagNameAndAttributes(tagName, attributes) {
    //     return this.getElementsByTagName(tagName).find(element => Object.keys(attributes).every(attr => element.hasAttribute(attr) && (element.getAttribute(attr) === attributes[attr] || attributes[attr] === null)))
    // }


    // Serialize back to original structure (useful for debugging)
    toObject() {
        const tagName = this.tagName

        if (tagName && this.node[tagName] && !isLeaf(tagName)) {
            this.node[tagName] = this.node[tagName].map(child => {
                return child instanceof XMLElement ? child.toObject() : child
            })
        }

        if (tagName === "#document") {
            return this.node["#document"]
        }

        return this.node
    }

    toString() {
        if (isLeaf(this.tagName)) {
            if (this.tagName === "#text") {
                return this.node[this.tagName]
            } else if (this.tagName === "__cdata") {
                return `<![CDATA[${this.node[this.tagName]}]]>`
            } else if (this.tagName === "#comment") {
                return `<!--${this.node[this.tagName]}-->`
            }
        }
        const builder = new XMLBuilder(fastXMLParserOptions)
        return builder.build(this.toObject())
    }
}

// Helper function to wrap the entire XML structure recursively
export const xmlDOM = (xmlString) => {
    const parser = new XMLParser(fastXMLParserOptions)
    // Parse the XML string into an object
    const xmlStructure = parser.parse(xmlString)

    const node = xmlStructure.length === 1 ?
        xmlStructure[0] :
        {"#document": xmlStructure}
    // Recursively wrap each node in XMLElement
    return new XMLElement(node)
}