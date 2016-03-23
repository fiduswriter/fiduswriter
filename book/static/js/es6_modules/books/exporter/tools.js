export let getMissingChapterData = function (aBook, callback) {
    let bookDocuments = []

    for (let i = 0; i < aBook.chapters.length; i++) {
        if (!_.findWhere(theDocumentList, {id: aBook.chapters[i].text})) {
            $.addAlert('error', "Cannot produce book as you lack access rights to its chapters.")
            return
        }
        bookDocuments.push(aBook.chapters[i].text)
    }
    documentHelpers.getMissingDocumentListData(bookDocuments, callback)
}

export let getImageAndBibDB = function (aBook, callback) {
    let documentOwners = []
    for (let i = 0; i < aBook.chapters.length; i++) {
        documentOwners.push(_.findWhere(theDocumentList, {
            id: aBook.chapters[i].text
        }).owner.id)
    }

    documentOwners = _.unique(documentOwners).join(',')

    usermediaHelpers.getAnImageDB(documentOwners, function (anImageDB) {
        bibliographyHelpers.getABibDB(documentOwners, function (
            aBibDB) {
            callback(anImageDB, aBibDB)
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
