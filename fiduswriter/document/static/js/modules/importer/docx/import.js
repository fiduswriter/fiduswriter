import {DocxImporter as GenericDocxImporter} from "@fiduswriter/document/importer/docx"
import {postJson} from "fwtoolkit"
import {createNativeImporterBackend} from "../native/import"

export class DocxImporter extends GenericDocxImporter {
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
            e2eeOptions: options.e2eeOptions
        })
    }
}
