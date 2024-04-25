// Mapping between Fidus Writer elements and Pandoc elements
export const elementMapping = {
    blockquote: "BlockQuote",
    bullet_list: "BulletList",
    contributors_part: "Div",
    heading_part: "Header",
    list_item: "ListItem",
    ordered_list: "OrderedList",
    paragraph: "Para"
}

export const convertText = (text) => {
    const textContent = []
    if (!text.length) {
        return []
    }
    const words = text.trim().split(" ")
    words.forEach((c, index) => {
        textContent.push({
            t: "Str",
            c
        })
        if (index < words.length - 1) {
            textContent.push({
                t: "Space"
            })
        }
    })
    return textContent
}

export const convertContributor = (contributor) => {
    const contributorContent = []
    if (contributor.firstname || contributor.lastname) {
        const nameParts = []
        if (contributor.lastname) {
            nameParts.push(contributor.lastname)
        }
        if (contributor.firstname) {
            nameParts.push(contributor.firstname)
        }
        contributorContent.push(...convertText(nameParts.join(" ")))
    } else if (contributor.institution) {
        contributorContent.push(...convertText(contributor.institution))
    }
    if (contributor.email) {
        contributorContent.push({
            "t": "Note",
            "c": [{
                "t": "Para",
                "c": [convertText(contributor.email)]
            }]
        })
    }
    return contributorContent.length ? {t: "MetaInlines", c: contributorContent} : false
}
