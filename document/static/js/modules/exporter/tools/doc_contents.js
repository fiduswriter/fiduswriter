// Return a json that is the same as the existing json, but with all parts
// marked as hidden removed.

export const removeHidden = function(
    node,
    // Whether to leave the outer part of the removed node.
    // True for tree-walking exporters, false for DOM-changing exporters.
    leaveStub = true
) {
    const returnNode = {}

    Object.keys(node).forEach(key => {
        if (key !== 'content') {
            returnNode[key] = node[key]
        }
    })
    if (node.attrs && node.attrs.hidden) {
        if (leaveStub) {
            return returnNode
        } else {
            return false
        }
    }
    if (node.content) {
        returnNode.content = []
        node.content.forEach(child => {
            const cleanedChild = removeHidden(child, leaveStub)
            if (cleanedChild) {
                returnNode.content.push(cleanedChild)
            }

        })
    }
    return returnNode
}


export const descendantNodes = function(node) {
    let returnValue = [node]
    if (node.content) {
        node.content.forEach(childNode => {
            returnValue = returnValue.concat(descendantNodes(childNode))
        })
    }
    return returnValue
}

export const textContent = function(node) {
    return descendantNodes(node).reduce(
        (returnString, subNode) => {
            if (subNode.text) {
                returnString += subNode.text
            }
            return returnString
        },
        ''
    )

}

// PM/HTML don't have cells that have been covered, but in ODT/DOCX, these cells
// need to be present. So we add them.

const addCoveredTableCells = function(node) {
    const columns = node.content[0].content.reduce((columns, cell) => columns + cell.attrs.colspan, 0)
    const rows = node.content.length
    // Add empty cells for col/rowspan
    const fixedTableMatrix = Array.apply(0, {length: rows}).map(
        _item => ({type: 'table_row', content: Array.apply(0, {length: columns})})
    )
    let rowIndex = -1
    node.content.forEach(row => {
        let columnIndex = 0
        rowIndex++
        if (!row.content) {
            return
        }
        row.content.forEach(cell => {
            while (
                fixedTableMatrix[rowIndex].content[columnIndex]
            ) {
                columnIndex++
            }
            for (let i=0; i < cell.attrs.rowspan; i++) {
                for (let j=0; j < cell.attrs.colspan; j++) {
                    let fixedCell
                    if (i===0 && j===0) {
                        fixedCell = cell
                    } else {
                        fixedCell = {
                            type: 'table_cell',
                            attrs: {
                                rowspan: cell.attrs.rowspan > 1 ? 0 : 1,
                                colspan: cell.attrs.colspan > 1 ? 0 : 1
                            }
                        }
                    }
                    fixedTableMatrix[rowIndex+i].content[columnIndex+j] = fixedCell
                }
            }
        })
    })
    node.content = fixedTableMatrix
}

export const fixTables = function(node) {
    if (node.type==='table') {
        addCoveredTableCells(node)
    }
    if (node.content) {
        node.content.forEach(child => fixTables(child))
    }
    return node
}
