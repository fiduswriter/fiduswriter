import {activateWait, deactivateWait, addAlert, post, postJson} from "../common"

const FW_LOCALSTORAGE_VERSION = "1.0"

export class BibliographyDB {
    constructor() {
        this.db = {}
        this.cats = []
    }

    /** Get the bibliography from the server and create as this.db.
     * @function getDB
     */

    getDB() {

        let lastModified = parseInt(window.localStorage.getItem('last_modified_biblist')),
            numberOfEntries = parseInt(window.localStorage.getItem('number_of_entries')),
            localStorageVersion = window.localStorage.getItem('version'),
            localStorageOwnerId = parseInt(window.localStorage.getItem('owner_id'))

        // A dictionary to look up bib fields by their fw type name.
        // Needed for translation to CSL and Biblatex.
        //Fill BibDB

        if (Number.isNaN(lastModified)) {
            lastModified = -1
        }

        if (Number.isNaN(numberOfEntries)) {
            numberOfEntries = -1
        }

        if (Number.isNaN(localStorageOwnerId)) {
            localStorageOwnerId = -1
        }

        if (
            localStorageVersion != FW_LOCALSTORAGE_VERSION
        ) {
            lastModified = -1
            numberOfEntries = -1
            localStorageOwnerId = -1
        }

        activateWait()
        return postJson(
            '/bibliography/biblist/',
            {
                last_modified: lastModified,
                number_of_entries: numberOfEntries,
                user_id: localStorageOwnerId
            }
        ).then(
            response => {
                let bibCats = response['bib_categories']
                bibCats.forEach(bibCat => {
                    this.cats.push(bibCat)
                })

                let bibList = []

                if (response.hasOwnProperty('bib_list')) {
                    bibList = response['bib_list']
                    try {
                        window.localStorage.setItem('biblist', JSON.stringify(bibList))
                        window.localStorage.setItem('last_modified_biblist', response['last_modified'])
                        window.localStorage.setItem('number_of_entries', response['number_of_entries'])
                        window.localStorage.setItem('owner_id', response['user_id'])
                        window.localStorage.setItem('version', FW_LOCALSTORAGE_VERSION)
                    } catch (error) {
                        // The local storage was likely too small
                    }
                } else {
                    bibList = JSON.parse(window.localStorage.getItem('biblist'))
                }

                let bibPKs = bibList.map(bibItem => this.serverBibItemToBibDB(bibItem))
                deactivateWait()
                return {bibPKs, bibCats}
            }
        ).catch(
            () => {
                addAlert('error', gettext('Could not obtain bibliography data'))
                deactivateWait()
                return Promise.reject()
            }
        )
    }

    /** Converts a bibliography item as it arrives from the server to a BibDB object.
     * @function serverBibItemToBibDB
     * @param item The bibliography item from the server.
     */
    serverBibItemToBibDB(item) {
        let id = item['id']
        let bibDBEntry = {}
        bibDBEntry['fields'] = JSON.parse(item['fields'])
        bibDBEntry['bib_type'] = item['bib_type']
        bibDBEntry['entry_key'] = item['entry_key']
        bibDBEntry['entry_cat'] = JSON.parse(item['entry_cat'])
        this.db[id] = bibDBEntry
        return id
    }

    /** Saves a bibliography entry to the database on the server.
     * @function saveBibEntries
     * @param tmpDB The bibliography DB with temporary IDs to be send to the server.
     */
    saveBibEntries(tmpDB, isNew) {
        // Fields field need to be stringified for saving in database.
        // dbObject is a clone of tmpDB with a stringified fields-field, so
        // the original tmpDB isn't destroyed.
        let dbObject = {}
        Object.keys(tmpDB).forEach((bibKey)=>{
            dbObject[bibKey] = Object.assign({}, tmpDB[bibKey])
            dbObject[bibKey].entry_cat = JSON.stringify(tmpDB[bibKey].entry_cat)
            dbObject[bibKey].fields = JSON.stringify(tmpDB[bibKey].fields)
        })

        return postJson(
            '/bibliography/save/',
            {
                is_new: isNew,
                bibs: JSON.stringify(dbObject)
            }
        ).then(
            response => {
                let idTranslations = response['id_translations']
                idTranslations.forEach(bibTrans => {
                    this.db[bibTrans[1]] = tmpDB[bibTrans[0]]
                })
                addAlert('success', gettext('The bibliography has been updated.'))
                return idTranslations
            }
        ).catch(
            () => addAlert('error', gettext('The bibliography could not be updated'))
        )

    }


    /** Update or create new category
     * @function createCategory
     * @param cats The category objects to add.
     */
    createCategory(cats) {
        activateWait()

        return postJson(
            '/bibliography/save_category/',
            {
                'ids[]': cats.ids,
                'titles[]': cats.titles
            }
        ).then(
            response => {
                let bibCats = response.entries // We receive both existing and new categories.
                // Replace the old with the new categories, but don't lose the link to the array (so delete each, then add each).
                while(this.cats.length > 0) {
                    this.cats.pop()
                }
                while(bibCats.length > 0) {
                    this.cats.push(bibCats.pop())
                }
                addAlert('success', gettext('The categories have been updated'))
                deactivateWait()
                return this.cats
            }
        ).catch(
            () => {
                addAlert('error', gettext('The categories could not be updated'))
                deactivateWait()
                return Promise.reject()
            }
        )

    }

    /** Delete a categories
     * @function deleteCategory
     * @param ids A list of ids to delete.
     */
    deleteCategory(ids) {

        return post(
            '/bibliography/delete_category/',
            {
                'ids[]': ids
            }
        ).then(
            () => {
                let deletedPks = ids.slice()
                let deletedBibCats = []
                this.cats.forEach(bibCat => {
                    if (ids.indexOf(bibCat.id) !== -1) {
                        deletedBibCats.push(bibCat)
                    }
                })
                deletedBibCats.forEach(bibCat => {
                    let index = this.cats.indexOf(bibCat)
                    this.cats.splice(index, 1)
                })
                return deletedPks
            }
        )

    }

    /** Delete a list of bibliography items both locally and on the server.
     * @function deleteBibEntries
     * @param ids A list of bibliography item ids that are to be deleted.
     */
    deleteBibEntries(ids) {
        ids = ids.map(id => parseInt(id))
        let postData = {
            'ids[]': ids
        }
        activateWait()

        return post(
            '/bibliography/delete/',
            {
                'ids[]': ids
            }
        ).then(
            () => {
                ids.forEach(id => {
                    delete this.db[id]
                })
                addAlert('success', gettext(
                    'The bibliography item(s) have been deleted'))
                deactivateWait()
                return ids
            }
        ).catch(
            () => {
                addAlert('error', 'The bibliography item(s) could not be deleted')
                deactivateWait()
                return Promise.reject()
            }
        )

    }


}
