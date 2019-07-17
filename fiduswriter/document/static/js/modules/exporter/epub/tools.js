import {FIG_CATS} from "../../schema/i18n"

export function getTimestamp() {
    const today = new Date()
    let second = today.getUTCSeconds()
    let minute = today.getUTCMinutes()
    let hour = today.getUTCHours()
    let day = today.getUTCDate()
    let month = today.getUTCMonth() + 1 //January is 0!
    const year = today.getUTCFullYear()

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
            newFootnote.innerHTML = '<p>'+footnoteCounter+'</p>'
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

export function setLinks(htmlEl, docNum) {
    const contentItems = []
    let title

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
                el.id = '_' + Math.random().toString(36).substr(2, 9)
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
        if (contentItems[i] && contentItems[i].delete) {
            delete contentItems[i].delete
            contentItems.splice(i, 1)
        }
    }
    return contentItems
}

export function addFigureLabels(htmlEl, language) {
    // Due to lacking CSS support in ereaders, figure numbers need to be hardcoded.
    htmlEl.querySelectorAll('figcaption .figure-cat-figure').forEach(
        (el, index) => {
            const suffix = el.parentElement.innerText.trim().length ? ': ' : ''
            el.innerHTML = `${FIG_CATS['figure'][language]} ${(index + 1)}${suffix}`
            el.classList.remove('figure-cat-figure')
        }
    )

    htmlEl.querySelectorAll('figcaption .figure-cat-photo').forEach(
        (el, index) => {
            const suffix = el.parentElement.innerText.trim().length ? ': ' : ''
            el.innerHTML = `${FIG_CATS['photo'][language]} ${(index + 1)}${suffix}`
            el.classList.remove('figure-cat-photo')
        }
    )

    htmlEl.querySelectorAll('figcaption .figure-cat-table').forEach(
        (el, index) => {
            const suffix = el.parentElement.innerText.trim().length ? ': ' : ''
            el.innerHTML = `${FIG_CATS['table'][language]} ${(index + 1)}${suffix}`
            el.classList.remove('figure-cat-table')
        }
    )
    return htmlEl

}
