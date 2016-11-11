import {activateWait, deactivateWait, addAlert, csrfToken} from "../common/common"

const FW_LOCALSTORAGE_VERSION = "1.0"

export class BibliographyDB {
    constructor(docOwnerId, useLocalStorage, oldDB, oldCats) {
        this.docOwnerId = docOwnerId
        this.useLocalStorage = useLocalStorage // Whether to use local storage to cache result
        if (oldDB) {
            this.db = oldDB
        } else {
            this.db = {}
        }
        if (oldCats) {
            this.cats = oldCats
        } else {
            this.cats = []
        }
    }

    // EXPORT
    /** Get the bibliography from the server and create as this.db.
     * @function getDB
     * @param callback Will be called afterward.
     */

    getDB(callback) {

        let lastModified = -1, numberOfEntries = -1, that = this

        if (this.useLocalStorage) {
            let lastModified = parseInt(window.localStorage.getItem('last_modified_biblist')),
                numberOfEntries = parseInt(window.localStorage.getItem('number_of_entries')),
                localStorageVersion = window.localStorage.getItem('version'),
                localStorageOwnerId = parseInt(window.localStorage.getItem('owner_id'))
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


        activateWait()

        jQuery.ajax({
            url: '/bibliography/biblist/',
            data: {
                'owner_id': that.docOwnerId,
                'last_modified': lastModified,
                'number_of_entries': numberOfEntries,
            },
            type: 'POST',
            dataType: 'json',
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: function(xhr, settings) {
                xhr.setRequestHeader("X-CSRFToken", csrfToken)
            },
            success: function (response, textStatus, jqXHR) {

                let newBibCats = response.bibCategories
                newBibCats.forEach(function(bibCat) {
                    that.cats.push(bibCat)
                })

                let bibList = []

                if (that.useLocalStorage) {
                    if (response.hasOwnProperty('bibList')) {
                        bibList = response.bibList
                        try {
                            window.localStorage.setItem('biblist', JSON.stringify(response.bibList))
                            window.localStorage.setItem('last_modified_biblist', response.last_modified)
                            window.localStorage.setItem('number_of_entries', response.number_of_entries)
                            window.localStorage.setItem('owner_id', response.that.docOwnerId)
                            window.localStorage.setItem('version', FW_LOCALSTORAGE_VERSION)
                        } catch (error) {
                            // The local storage was likely too small
                        }
                    } else {
                        bibList = JSON.parse(window.localStorage.getItem('biblist'))
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
                addAlert('error', jqXHR.responseText)
            },
            complete: function () {
                deactivateWait()
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
        this.db[id] = aBibDBEntry
        return id
    }

    /** Saves a bibliography entry to the database on the server.
     * @function createBibEntry
     * @param postData The bibliography data to send to the server.
     */
    createBibEntry(bibData, callback) {
        console.log(bibData)
        let that = this
        activateWait()
        jQuery.ajax({
            url: '/bibliography/save/',
            data: {bib_data: JSON.stringify(bibData)},
            type: 'POST',
            dataType: 'json',
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: function(xhr, settings) {
                xhr.setRequestHeader("X-CSRFToken", csrfToken)
            },
            success: function (response, textStatus, jqXHR) {
                if (that.displayCreateBibEntryError(response.errormsg)) {
                    addAlert('success', gettext('The bibliography has been updated'))
                    let newBibPks = []
                    let bibList = response.values
                    for (let i = 0; i < bibList.length; i++) {
                        newBibPks.push(that.serverBibItemToBibDB(bibList[i]))
                    }
                    if (callback) {
                        callback(newBibPks)
                    }
                } else {
                    addAlert('error', gettext('Some errors are found. Please examine the form.'))
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                addAlert('error', errorThrown)
            },
            complete: function () {
                deactivateWait()
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
            let eMsg = '<div class="warning">' + errors[eKey] + '</div>'
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
        activateWait()
        jQuery.ajax({
            url: '/bibliography/save_category/',
            data: postData,
            type: 'POST',
            dataType: 'json',
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: function(xhr, settings) {
                xhr.setRequestHeader("X-CSRFToken", csrfToken)
            },
            success: function (response, textStatus, jqXHR) {
                if (jqXHR.status == 201) {
                    let bibCats = response.entries // We receive both existing and new categories.
                    // Replace the old with the new categories, but don't lose the link to the array (so delete each, then add each).
                    while(that.cats.length > 0) {
                        that.cats.pop()
                    }
                    while(bibCats.length > 0) {
                        that.cats.push(bibCats.pop())
                    }

                    addAlert('success', gettext('The categories have been updated'))
                    if (callback) {
                        callback(that.cats)
                    }
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                addAlert('error', jqXHR.responseText)
            },
            complete: function () {
                deactivateWait()
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
        jQuery.ajax({
            url: '/bibliography/delete_category/',
            data: postData,
            type: 'POST',
            dataType: 'json',
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: function(xhr, settings) {
                xhr.setRequestHeader("X-CSRFToken", csrfToken)
            },
            success: function (response, textStatus, jqXHR) {
                let deletedPks = ids.slice()
                let deletedBibCats = []
                that.cats.forEach(function(bibCat) {
                    if (ids.indexOf(bibCat.id) !== -1) {
                        deletedBibCats.push(bibCat)
                    }
                })
                deletedBibCats.forEach(function(bibCat) {
                    let index = that.cats.indexOf(bibCat)
                    that.cats.splice(index, 1)
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
        activateWait()
        jQuery.ajax({
            url: '/bibliography/delete/',
            data: postData,
            type: 'POST',
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: function(xhr, settings) {
                xhr.setRequestHeader("X-CSRFToken", csrfToken)
            },
            success: function (response, textStatus, jqXHR) {
                for (let i = 0; i < ids.length; i++) {
                    delete that.db[ids[i]]
                }
                addAlert('success', gettext(
                    'The bibliography item(s) have been deleted'))
                if (callback) {
                    callback(ids)
                }
            },
            error: function (jqXHR, textStatus, errorThrown) {
                addAlert('error', jqXHR.responseText)
            },
            complete: function () {
                deactivateWait()
            }
        })
    }


}
