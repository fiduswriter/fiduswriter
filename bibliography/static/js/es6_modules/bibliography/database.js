
const FW_LOCALSTORAGE_VERSION = "1.0"

export class BibliographyDB {
    constructor(docOwnerId, useLocalStorage, oldBibDB, oldBibCats) {
        this.docOwnerId = docOwnerId
        this.useLocalStorage = useLocalStorage // Whether to use local storage to cache result
        if (oldBibDB) {
            this.bibDB = oldBibDB
        } else {
            this.bibDB = {}
        }
        if (oldBibCats) {
            this.bibCats = oldBibCats
        } else {
            this.bibCats = []
        }
    }

    // EXPORT
    /** Get the bibliography from the server and create as window.BibDB.
     * @function getBibDB
     * @param callback Will be called afterward.
     */

    getBibDB(callback) {

        let lastModified = -1, numberOfEntries = -1, that = this

        if (this.useLocalStorage) {
            let lastModified = parseInt(localStorage.getItem('last_modified_biblist')),
                numberOfEntries = parseInt(localStorage.getItem('number_of_entries')),
                localStorageVersion = localStorage.getItem('version'),
                localStorageOwnerId = parseInt(localStorage.getItem('owner_id'))
                that = this

            // A dictionary to look up bib fields by their fw type name. Needed for translation to CSL and Biblatex.
            //jQuery('#bibliography').dataTable().fnDestroy()
            //Fill BibDB

            if (_.isNaN(lastModified)) {
                lastModified = -1
            }

            if (_.isNaN(numberOfEntries)) {
                numberOfEntries = -1
            }

            if (localStorageVersion != FW_LOCALSTORAGE_VERSION || localStorageOwnerId != this.docOwnerId) {
                lastModified = -1
                numberOfEntries = -1
            }
        }


        $.activateWait()

        $.ajax({
            url: '/bibliography/biblist/',
            data: {
                'owner_id': that.docOwnerId,
                'last_modified': lastModified,
                'number_of_entries': numberOfEntries,
            },
            type: 'POST',
            dataType: 'json',
            success: function (response, textStatus, jqXHR) {

                let newBibCats = response.bibCategories
                newBibCats.forEach(function(bibCat) {
                    that.bibCats.push(bibCat)
                })

                let bibList = []

                if (that.useLocalStorage) {
                    if (response.hasOwnProperty('bibList')) {
                        bibList = response.bibList
                        try {
                            localStorage.setItem('biblist', JSON.stringify(response.bibList))
                            localStorage.setItem('last_modified_biblist', response.last_modified)
                            localStorage.setItem('number_of_entries', response.number_of_entries)
                            localStorage.setItem('owner_id', response.that.docOwnerId)
                            localStorage.setItem('version', FW_LOCALSTORAGE_VERSION)
                        } catch (error) {
                            // The local storage was likely too small
                        }
                    } else {
                        bibList = JSON.parse(localStorage.getItem('biblist'))
                    }
                } else {
                    bibList = response.bibList
                }
                let newBibPks = []
                for (let i = 0; i < bibList.length; i++) {
                    newBibPks.push(that.serverBibItemToBibDB(bibList[i]))
                }
                if (callback) {
                    callback(newBibPks, newBibCats)
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                $.addAlert('error', jqXHR.responseText)
            },
            complete: function () {
                $.deactivateWait()
            }
        })
    }

    /** Converts a bibliography item as it arrives from the server to a BibDB object.
     * @function serverBibItemToBibDB
     * @param item The bibliography item from the server.
     */
    serverBibItemToBibDB(item) {
        let id = item['id']
        let aBibDBEntry = JSON.parse(item['fields'])
        aBibDBEntry['entry_type'] = item['entry_type']
        aBibDBEntry['entry_key'] = item['entry_key']
        aBibDBEntry['entry_cat'] = item['entry_cat']
        this.bibDB[id] = aBibDBEntry
        return id
    }

    /** Saves a bibliography entry to the database on the server.
     * @function createBibEntry
     * @param postData The bibliography data to send to the server.
     */
    createBibEntry(postData, callback) {
        let that = this
        $.activateWait()
        $.ajax({
            url: '/bibliography/save/',
            data: postData,
            type: 'POST',
            dataType: 'json',
            success: function (response, textStatus, jqXHR) {
                if (that.displayCreateBibEntryError(response.errormsg)) {
                    $.addAlert('success', gettext('The bibliography has been updated'))
                    let newBibPks = []
                    let bibList = response.values
                    for (let i = 0; i < bibList.length; i++) {
                        newBibPks.push(that.serverBibItemToBibDB(bibList[i]))
                    }
                    if (callback) {
                        callback(newBibPks)
                    }
                } else {
                    $.addAlert('error', gettext('Some errors are found. Please examine the form.'))
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                $.addAlert('error', errorThrown)
            },
            complete: function () {
                $.deactivateWait()
            }
        })
    }

    /** Displays an error on bibliography entry creation
     * @function displayCreateBibEntryError
     * @param errors Errors to be displayed
     */
    displayCreateBibEntryError(errors) {
        let noError = true
        for (let eKey in errors) {
            eMsg = '<div class="warning">' + errors[eKey] + '</div>'
            if ('error' == eKey) {
                jQuery('#createbook').prepend(eMsg)
            } else {
                jQuery('#id_' + eKey).after(eMsg)
            }
            noError = false
        }
        return noError
    }

    /** Update or create new category
     * @function createCategory
     * @param cats The category objects to add.
     */
    createCategory(cats, callback) {
        let that = this
        let postData = {
            'ids[]': cats.ids,
            'titles[]': cats.titles
        }
        $.activateWait()
        $.ajax({
            url: '/bibliography/save_category/',
            data: postData,
            type: 'POST',
            dataType: 'json',
            success: function (response, textStatus, jqXHR) {
                if (jqXHR.status == 201) {
                    let bibCats = response.entries // We receive both existing and new categories.
                    // Replace the old with the new categories, but don't lose the link to the array (so delete each, then add each).
                    while(that.bibCats.length > 0) {
                        that.bibCats.pop()
                    }
                    while(bibCats.length > 0) {
                        that.bibCats.push(bibCats.pop())
                    }

                    $.addAlert('success', gettext('The categories have been updated'))
                    if (callback) {
                        callback(that.bibCats)
                    }
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                $.addAlert('error', jqXHR.responseText)
            },
            complete: function () {
                $.deactivateWait()
            }
        })
    }

    /** Delete a categories
     * @function deleteCategory
     * @param ids A list of ids to delete.
     */
    deleteCategory(ids, callback) {

        let postData = {
            'ids[]': ids
        }, that = this
        $.ajax({
            url: '/bibliography/delete_category/',
            data: postData,
            type: 'POST',
            dataType: 'json',
            success: function (response, textStatus, jqXHR) {
                let deletedPks = ids.slice()
                let deletedBibCats = []
                that.bibCats.forEach(function(bibCat) {
                    if (ids.indexOf(bibCat.id) !== -1) {
                        deletedBibCats.push(bibCat)
                    }
                })
                deletedBibCats.forEach(function(bibCat) {
                    let index = that.bibCats.indexOf(bibCat)
                    that.bibCats.splice(index, 1)
                })
                if (callback) {
                    callback(deletedPks)
                }
            }
        })
    }

    /** Delete a list of bibliography items both locally and on the server.
     * @function deleteBibEntry
     * @param ids A list of bibliography item ids that are to be deleted.
     */
    deleteBibEntry(ids, callback) {
        let that = this
        for (let i = 0; i < ids.length; i++) {
            ids[i] = parseInt(ids[i])
        }
        let postData = {
            'ids[]': ids
        }
        $.activateWait()
        $.ajax({
            url: '/bibliography/delete/',
            data: postData,
            type: 'POST',
            success: function (response, textStatus, jqXHR) {
                for (let i = 0; i < ids.length; i++) {
                    delete that.bibDB[ids[i]]
                }
                $.addAlert('success', gettext(
                    'The bibliography item(s) have been deleted'))
                if (callback) {
                    callback(ids)
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                $.addAlert('error', jqXHR.responseText)
            },
            complete: function () {
                $.deactivateWait()
            }
        })
    }


}
