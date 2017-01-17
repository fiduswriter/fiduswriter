import {getMissingDocumentListData} from "../../documents/tools"
import {BibliographyDB} from "../../bibliography/database"
import {ImageDB} from "../../images/database"
import {addAlert} from "../../common"

export let getMissingChapterData = function (aBook, documentList, callback) {
    let bookDocuments = []

    for (let i = 0; i < aBook.chapters.length; i++) {
        if (!_.findWhere(documentList, {id: aBook.chapters[i].text})) {
            addAlert('error', "Cannot produce book as you lack access rights to its chapters.")
            return
        }
        bookDocuments.push(aBook.chapters[i].text)
    }
    getMissingDocumentListData(bookDocuments, documentList, callback)
}

export let getImageAndBibDB = function (aBook, documentList, callback) {
    let documentOwners = []
    for (let i = 0; i < aBook.chapters.length; i++) {
        documentOwners.push(_.findWhere(documentList, {
            id: aBook.chapters[i].text
        }).owner.id)
    }

    documentOwners = _.unique(documentOwners).join(',')
    let imageGetter = new ImageDB(documentOwners)
    imageGetter.getDB().then(() => {
        let bibGetter = new BibliographyDB(documentOwners, false, false, false)
        bibGetter.getDB().then(() => {
            callback(imageGetter, bibGetter)
        })
    })
}


export let uniqueObjects = function (array) {
    let results = []

    for (let i = 0; i < array.length; i++) {
        let willCopy = true
        for (let j = 0; j < i; j++) {
            if (_.isEqual(array[i], array[j])) {
                willCopy = false
                break
            }
        }
        if (willCopy) {
            results.push(array[i])
        }
    }

    return results
}
