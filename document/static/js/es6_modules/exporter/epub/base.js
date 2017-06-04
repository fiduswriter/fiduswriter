import {BaseHTMLExporter} from "../html/base"

export class BaseEpubExporter extends BaseHTMLExporter {
    getTimestamp() {
        let today = new Date()
        let second = today.getUTCSeconds()
        let minute = today.getUTCMinutes()
        let hour = today.getUTCHours()
        let day = today.getUTCDate()
        let month = today.getUTCMonth() + 1 //January is 0!
        let year = today.getUTCFullYear()

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

        return year + '-' + month + '-' + day + 'T' + hour + ':' +
            minute + ':' + second + 'Z'
    }

    styleEpubFootnotes(htmlCode) {
        // Converts RASH style footnotes into epub footnotes.
        let footnotes = [].slice.call(htmlCode.querySelectorAll('section#fnlist section[role=doc-footnote]'))
        let footnoteCounter = 1
        footnotes.forEach(footnote => {
            let newFootnote = document.createElement('aside')
            newFootnote.setAttribute('epub:type', 'footnote')
            newFootnote.id = footnote.id
            if(footnote.firstChild) {
                while(footnote.firstChild) {
                    newFootnote.appendChild(footnote.firstChild)
                }
                newFootnote.firstChild.innerHTML = footnoteCounter + ' ' + newFootnote.firstChild.innerHTML
            } else {
                newFootnote.innerHTML = '<p>'+footnoteCounter+'</p>'
            }

            footnote.parentNode.replaceChild(newFootnote, footnote)
            footnoteCounter++
        })
        let footnoteMarkers = [].slice.call(htmlCode.querySelectorAll('a.fn'))
        let footnoteMarkerCounter = 1
        footnoteMarkers.forEach(fnMarker => {
            let newFnMarker = document.createElement('sup')
            let newFnMarkerLink = document.createElement('a')
            newFnMarkerLink.setAttribute('epub:type', 'noteref')
            newFnMarkerLink.setAttribute('href', fnMarker.getAttribute('href'))
            newFnMarkerLink.innerHTML = footnoteMarkerCounter
            newFnMarker.appendChild(newFnMarkerLink)
            fnMarker.parentNode.replaceChild(newFnMarker, fnMarker)
            footnoteMarkerCounter++
        })

        return htmlCode
    }



    setLinks(htmlCode, docNum) {
        let contentItems = [], title

        jQuery(htmlCode).find('h1,h2,h3,h4,h5,h6').each(function() {
            title = jQuery.trim(this.textContent)
            if (title !== '') {
                let contentItem = {}
                contentItem.title = title
                contentItem.level = parseInt(this.tagName.substring(
                    1, 2))
                if (docNum) {
                    contentItem.docNum = docNum
                }
                if (this.classList.contains('title')) {
                    contentItem.level = 0
                }

                contentItem.id = this.id
                contentItems.push(contentItem)
            }
        })
        return contentItems
    }

    orderLinks(contentItems) {
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

}
