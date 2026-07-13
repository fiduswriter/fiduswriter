import {BibliographyImporter} from "@fiduswriter/bibliography-manager/import"
import {PandocImporter as GenericPandocImporter} from "@fiduswriter/document/importer/pandoc"
import {postJson} from "fwtoolkit"
import {createNativeImporterBackend} from "../native/import"

export class PandocImporter extends GenericPandocImporter {
    constructor(file, user, path, importId, options = {}) {
        super(file, user, path, importId, {
            getTemplate: importId =>
                postJson("/api/document/get_template/", {
                    import_id: importId
                }).then(({json}) => json.template),
            importBibliography: bibString =>
                new Promise(resolve => {
                    if (!bibString) {
                        resolve({})
                        return
                    }
                    const tempBibDB = {
                        saveBibEntries: data =>
                            Promise.resolve(
                                Object.entries(data).map((entry, index) => [
                                    entry[0],
                                    index + 1
                                ])
                            )
                    }
                    const importer = new BibliographyImporter(
                        bibString,
                        tempBibDB,
                        () => {},
                        () => {},
                        false
                    )
                    const originalOnMessage = importer.onMessage
                    importer.onMessage = function (message) {
                        if (message.type === "data") {
                            resolve(message.data)
                        }
                        originalOnMessage.call(this, message)
                    }
                    importer.init()
                }),
            nativeBackend: createNativeImporterBackend(
                user,
                options.e2eeOptions
            ),
            e2eeOptions: options.e2eeOptions
        })
    }
}
