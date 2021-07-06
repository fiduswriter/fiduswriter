import {CATS} from "../../schema/i18n"

export function getTimestamp(date) {
    let second = date.getUTCSeconds()
    let minute = date.getUTCMinutes()
    let hour = date.getUTCHours()
    let day = date.getUTCDate()
    let month = date.getUTCMonth() + 1 //January is 0!
    const year = date.getUTCFullYear()

    if (second < 10) {
        second = '0' + second
    }
    if (minute < 10) {
        minute = '0' + minute
    }
    if (hour < 10) {
        hour = '0' + hour
    }
    if (day < 10) {
        day = '0' + day
    }
    if (month < 10) {
        month = '0' + month
    }

    return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`
}

export function styleEpubFootnotes(htmlEl) {
    // Converts RASH style footnotes into epub footnotes.
    htmlEl.querySelector('section.fnlist').setAttribute('role', 'doc-endnotes')
    const footnotes = htmlEl.querySelectorAll('section.fnlist section[role=doc-footnote]')
    let footnoteCounter = 1
    footnotes.forEach(footnote => {
        const newFootnote = document.createElement('aside')
        newFootnote.setAttribute('epub:type', 'footnote')
        newFootnote.id = footnote.id
        if (footnote.firstChild) {
            while (footnote.firstChild) {
                newFootnote.appendChild(footnote.firstChild)
            }
            newFootnote.firstChild.innerHTML = footnoteCounter + ' ' + newFootnote.firstChild.innerHTML
        } else {
            newFootnote.innerHTML = '<p>' + footnoteCounter + '</p>'
        }

        footnote.parentNode.replaceChild(newFootnote, footnote)
        footnoteCounter++
    })
    const footnoteMarkers = htmlEl.querySelectorAll('a.fn')
    let footnoteMarkerCounter = 1
    footnoteMarkers.forEach(fnMarker => {
        const newFnMarker = document.createElement('sup')
        const newFnMarkerLink = document.createElement('a')
        newFnMarkerLink.setAttribute('epub:type', 'noteref')
        newFnMarkerLink.setAttribute('href', fnMarker.getAttribute('href'))
        newFnMarkerLink.innerHTML = footnoteMarkerCounter
        newFnMarker.appendChild(newFnMarkerLink)
        fnMarker.parentNode.replaceChild(newFnMarker, fnMarker)
        footnoteMarkerCounter++
    })

    return htmlEl
}

export function setLinks(htmlEl, docNum = 0) {
    const contentItems = []
    let title
    let idCount = 0

    htmlEl.querySelectorAll('div.article-title,h1,h2,h3,h4,h5,h6').forEach(el => {
        title = el.textContent.trim()
        if (title !== '' || el.classList.contains('article-title')) {
            const contentItem = {}
            contentItem.title = title
            contentItem.level = el.classList.contains('article-title') ? 0 : parseInt(el.tagName.substring(1, 2))
            if (docNum) {
                contentItem.docNum = docNum
            }
            if (!el.id) {
                // The element has no ID, so we add one.
                el.id = `_${docNum}_${idCount++}`
            }
            contentItem.id = el.id
            contentItems.push(contentItem)
        }
    })
    return contentItems
}

export function orderLinks(contentItems) {
    for (let i = 0; i < contentItems.length; i++) {
        contentItems[i].subItems = []
        if (i > 0) {
            for (let j = i - 1; j > -1; j--) {
                if (contentItems[j].level < contentItems[i].level) {
                    contentItems[j].subItems.push(contentItems[i])
                    contentItems[i].delete = true
                    break
                }
            }
        }

    }

    for (let i = contentItems.length; i > -1; i--) {
        if (contentItems[i]?.delete) {
            delete contentItems[i].delete
            contentItems.splice(i, 1)
        }
    }
    return contentItems
}

export function addCategoryLabels(htmlEl, language, footnote = false) {
    // Due to lacking CSS support in ereaders, figure numbers need to be hardcoded.
    htmlEl.querySelectorAll("figure[data-category='figure'] figcaption span.label").forEach(
        (el, index) => {
            const suffix = el.parentElement.innerText.trim().length ? ': ' : ''
            el.innerHTML = `${CATS['figure'][language]} ${(index + 1)}${footnote ? 'A' : ''}${suffix}`
            el.classList.remove('label')
        }
    )

    htmlEl.querySelectorAll("figure[data-category='equation'] figcaption span.label").forEach(
        (el, index) => {
            const suffix = el.parentElement.innerText.trim().length ? ': ' : ''
            el.innerHTML = `${CATS['equation'][language]} ${(index + 1)}${footnote ? 'A' : ''}${suffix}`
            el.classList.remove('label')
        }
    )

    htmlEl.querySelectorAll("figure[data-category='photo'] figcaption span.label").forEach(
        (el, index) => {
            const suffix = el.parentElement.innerText.trim().length ? ': ' : ''
            el.innerHTML = `${CATS['photo'][language]} ${(index + 1)}${footnote ? 'A' : ''}${suffix}`
            el.classList.remove('label')
        }
    )

    htmlEl.querySelectorAll("figure[data-category='table'] figcaption span.label,table[data-category='table'] caption span.label").forEach(
        (el, index) => {
            const suffix = el.parentElement.innerText.trim().length ? ': ' : ''
            el.innerHTML = `${CATS['table'][language]} ${(index + 1)}${footnote ? 'A' : ''}${suffix}`
            el.classList.remove('label')
        }
    )
    return htmlEl
}
