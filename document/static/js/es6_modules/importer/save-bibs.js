import {csrfToken} from "../common"

export class SaveBibs {
    constructor(newBibEntries, BibTranslationTable, bibDB) {
        this.newBibEntries = newBibEntries
        this.BibTranslationTable = BibTranslationTable
        this.bibDB = bibDB
    }

    init() {
        if (Object.keys(this.newBibEntries).length > 0) {

            // TODO: The following is copied from bibliography/database.js and
            // it should really only need to be there.
            //
            // Fields field need to be stringified for saving in database.
            // dbObject is a clone of tmpDB with a stringified fields-field, so
            // the original tmpDB isn't destroyed.
            let dbObject = {}
            Object.keys(this.newBibEntries).forEach((bibKey)=>{
                dbObject[bibKey] =  Object.assign({}, this.newBibEntries[bibKey])
                dbObject[bibKey].entry_cat = JSON.stringify(this.newBibEntries[bibKey].entry_cat)
                dbObject[bibKey].fields = JSON.stringify(this.newBibEntries[bibKey].fields)
            })
            let sendData = {
                is_new: true,
                bibs: JSON.stringify(dbObject)
            }
            return new Promise ((resolve, reject) => {
                jQuery.ajax({
                    url: '/bibliography/save/',
                    data: sendData,
                    type: 'POST',
                    dataType: 'json',
                    crossDomain: false, // obviates need for sameOrigin test
                    beforeSend: (xhr, settings) => xhr.setRequestHeader("X-CSRFToken", csrfToken),
                    success: (response, textStatus, jqXHR) => {
                        response.id_translations.forEach(trans=>{
                            this.bibDB[trans[1]] = this.newBibEntries[trans[0]]
                            this.BibTranslationTable[trans[0]] = trans[1]
                        })
                        resolve()
                    },
                    error: (jqXHR, textStatus, errorThrown) => {
                        console.error(jqXHR.responseText)
                        reject()
                    }
                })
            })

        } else {
            return Promise.resolve()
        }
    }
}
