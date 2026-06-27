import {OdtImporter as GenericOdtImporter} from "@fiduswriter/document/importer/odt"
import {postJson} from "fwtoolkit"
import {createNativeImporterBackend} from "../native/import"

export class OdtImporter extends GenericOdtImporter {
    constructor(file, user, path, importId, options = {}) {
        super(file, user, path, importId, {
            getTemplate: importId =>
                postJson("/api/document/get_template/", {
                    import_id: importId
                }).then(({json}) => json.template),
            nativeBackend: createNativeImporterBackend(
                user,
                options.e2eeOptions
            ),
            bibDB: options.bibDB,
            e2eeOptions: options.e2eeOptions
        })
    }
}
