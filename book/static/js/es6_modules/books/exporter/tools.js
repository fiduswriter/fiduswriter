import {getMissingDocumentListData} from "../../documents/tools"
import {BibliographyDB} from "../../bibliography/database"
import {ImageDB} from "../../images/database"
import {addAlert} from "../../common"

export let getMissingChapterData = function (aBook, documentList) {
    let bookDocuments = []

    for (let i = 0; i < aBook.chapters.length; i++) {
        if (!_.findWhere(documentList, {id: aBook.chapters[i].text})) {
            addAlert('error', "Cannot produce book as you lack access rights to its chapters.")
            return Promise.reject()
        }
        bookDocuments.push(aBook.chapters[i].text)
    }
    return getMissingDocumentListData(bookDocuments, documentList)
}

export let getImageAndBibDB = function (aBook, documentList) {
    let documentOwners = []
    for (let i = 0; i < aBook.chapters.length; i++) {
        documentOwners.push(_.findWhere(documentList, {
            id: aBook.chapters[i].text
        }).owner.id)
    }

    documentOwners = _.unique(documentOwners).join(',')
    let imageDB = new ImageDB(documentOwners)
    let bibDB = new BibliographyDB(documentOwners)
    return imageDB.getDB().then(
        bibDB => bibDB.getDB()
    ).then(
        () => Promise.resolve({imageDB, bibDB})
    )
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
