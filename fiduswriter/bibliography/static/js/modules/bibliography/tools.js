// Takes any richtext text field as used in bibliography and returns the text contents
export function litToText(litStringArray) {
    let outText = ''
    litStringArray.forEach((litString) => {
        if (litString.type === 'text') {
            outText += litString.text
        }
    })
    return outText
}

export function nameToText(nameList) {
    let nameString = ''
    if (nameList.length === 0) {
        return nameString
    }
    if (nameList[0]['family']) {
        nameString += litToText(nameList[0]['family'])
        if (nameList[0]['given']) {
            nameString += `, ${litToText(nameList[0]['given'])}`
        }
    } else if (nameList[0]['literal']) {
        nameString += litToText(nameList[0]['literal'])
    }

    if (1 < nameList.length) {
        //if there are more authors, add "and others" behind.
        nameString += gettext(' and others')
    }

    return nameString
}
