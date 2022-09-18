import {escapeText} from "../../common"

export function convertTexts(nodeList) {
    return nodeList.map(node => convertText(node)).join("")
}

export function convertText(node) {
    let start = ""
    let end = ""
    let strong, em, underline, hyperlink
    // Check for hyperlink, bold/strong, italic/em and underline
    if (node.marks) {
        strong = node.marks.find(mark => mark.type === "strong")
        em = node.marks.find(mark => mark.type === "em")
        underline = node.marks.find(mark => mark.type === "underline")
        hyperlink = node.marks.find(mark => mark.type === "link")
    }
    if (em) {
        start += "<italic>"
        end = "</italic>" + end
    }
    if (strong) {
        start += "<bold>"
        end = "</bold>" + end
    }
    if (underline) {
        start += "<underline>"
        end = "</underline>" + end
    }
    if (hyperlink) {
        const href = hyperlink.attrs.href
        if (href[0] === "#") {
            // Internal link
            start += `<xref rid="${href.substring(1)}">`
            end = "</xref>" + end
        } else {
            // External link
            start += `<ext-link xlink:href="${href}" ext-link-type="uri" xlink:title="${hyperlink.attrs.title}">`
            end = "</ext-link>" + end
        }
    }
    return start + escapeText(node.text) + end
}
