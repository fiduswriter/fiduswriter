import {jsonPost, jsonPostJson} from "../../common/network"

// class for server calls of BibliographyDB.
export class BibliographyDBServerConnector {
    constructor(settings) {
        this.settings = settings
    }

    getDB(lastModified, numberOfEntries, localStorageOwnerId) {
        return jsonPostJson("/api/bibliography/biblist/", this.settings, {
            last_modified: lastModified,
            number_of_entries: numberOfEntries,
            user_id: localStorageOwnerId
        }).then(({json}) => {
            return {
                bibCats: json["bib_categories"],
                bibList: json.hasOwnProperty("bib_list")
                    ? json["bib_list"].map(item =>
                          this.serverBibItemToBibDB(item)
                      )
                    : false,
                lastModified: json["last_modified"],
                numberOfEntries: json["number_of_entries"],
                userId: json["user_id"]
            }
        })
    }

    /** Converts a bibliography item as it arrives from the server to a BibDB object.
     * @function serverBibItemToBibDB
     * @param item The bibliography item from the server.
     */
    serverBibItemToBibDB(bibDBEntry) {
        return {id: bibDBEntry["id"], bibDBEntry}
    }

    saveBibEntries(tmpDB, isNew) {
        return jsonPostJson("/api/bibliography/save/", this.settings, {
            is_new: isNew,
            bibs: tmpDB
        }).then(({json}) => json["id_translations"])
    }

    saveCategories(cats) {
        return jsonPostJson(
            "/api/bibliography/save_category/",
            this.settings,
            cats
        ).then(({json}) => {
            return json.entries
        })
    }

    deleteCategory(ids) {
        return jsonPost("/api/bibliography/delete_category/", this.settings, {
            ids
        })
    }

    deleteBibEntries(ids) {
        return jsonPost("/api/bibliography/delete/", this.settings, {ids})
    }
}
