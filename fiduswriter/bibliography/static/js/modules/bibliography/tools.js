// Extract a display year from an EDTF date string.
// Handles simple years, ranges (2023/2024), uncertainty (?, *, u), and open-ended dates.
export function dateToYear(dateStr) {
    if (!dateStr) {
        return ""
    }
    // Take the first date component (before "/" for ranges or open-ended dates)
    const firstPart = dateStr.split("/")[0]
    // Strip uncertainty/wildcard characters to get a clean year
    return firstPart.replace(/[?*u~]/g, "")
}

// Takes any richtext text field as used in bibliography and returns the text contents
export function litToText(litStringArray) {
    let outText = ""
    litStringArray.forEach(litString => {
        if (litString.type === "text") {
            outText += litString.text
        }
    })
    return outText
}

function nameListItemToString(nameListItem) {
    let nameString = ""
    if (nameListItem["family"]) {
        nameString += litToText(nameListItem["family"])
        if (nameListItem["given"]) {
            nameString += `, ${litToText(nameListItem["given"])}`
        }
    } else if (nameListItem["literal"]) {
        nameString += litToText(nameListItem["literal"])
    }
    return nameString
}

export function nameToText(nameList) {
    let nameString
    switch (nameList.length) {
        case 0:
            nameString = ""
            break
        case 1:
            nameString = nameListItemToString(nameList[0])
            break
        case 2:
            nameString = `${nameListItemToString(nameList[0])} ${gettext(
                "and"
            )} ${nameListItemToString(nameList[1])}`
            break
        default:
            nameString = `${nameListItemToString(nameList[0])} ${gettext(
                "and others"
            )}`
            break
    }
    return nameString
}
