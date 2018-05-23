import {post, postJson} from "../../common/network"


// class for server calls of BibliographyDB.
export class BibliographyDBServerConnector {

    constructor(csrfToken) {
        this.csrfToken = csrfToken // To be usable from worker
    }

    getDB(lastModified, numberOfEntries, localStorageOwnerId) {
        return postJson(
            '/bibliography/biblist/',
            {
                last_modified: lastModified,
                number_of_entries: numberOfEntries,
                user_id: localStorageOwnerId
            },
            this.csrfToken
        ).then(
            ({json}) => {
                return {
                    bibCats: json['bib_categories'],
                    bibList: json.hasOwnProperty('bib_list') ? json['bib_list'].map(item => this.serverBibItemToBibDB(item)) : false,
                    lastModified: json['last_modified'],
                    numberOfEntries: json['number_of_entries'],
                    userId: json['user_id']
                }
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
        return {id, bibDBEntry}
    }



    saveBibEntries(tmpDB, isNew) {
        // Fields field need to be stringified for saving in database.
        // dbObject is a clone of tmpDB with a stringified fields-field, so
        // the original tmpDB isn't destroyed.
        let dbObject = {}
        Object.keys(tmpDB).forEach(bibKey => {
            dbObject[bibKey] = Object.assign({}, tmpDB[bibKey])
            dbObject[bibKey].entry_cat = JSON.stringify(tmpDB[bibKey].entry_cat)
            dbObject[bibKey].fields = JSON.stringify(tmpDB[bibKey].fields)
        })

        return postJson(
            '/bibliography/save/',
            {
                is_new: isNew,
                bibs: JSON.stringify(dbObject)
            },
            this.csrfToken
        ).then(
            ({json}) => json['id_translations']
        )
    }

    createCategory(cats) {
        return postJson(
            '/bibliography/save_category/',
            {
                'ids': cats.ids,
                'titles': cats.titles
            },
            this.csrfToken
        ).then(
            ({json}) => {
                return json.entries
            }
        )
    }

    deleteCategory(ids) {
        return post(
            '/bibliography/delete_category/',
            {ids},
            this.csrfToken
        )
    }

    deleteBibEntries(ids) {
        return post(
            '/bibliography/delete/',
            {ids},
            this.csrfToken
        )
    }


}
