import {ExportFidusFile as GenericExportFidusFile} from "@fiduswriter/document/exporter/native"
import {addProgress, gettext, shortFileTitle} from "fwtoolkit"
import {DocumentTemplateExporter} from "../../document_template/exporter"

export class ExportFidusFile extends GenericExportFidusFile {
    constructor(doc, bibDB, imageDB, includeTemplate = true, token = false) {
        const title = shortFileTitle(doc.title, doc.path || "")
        const task = addProgress(
            "info",
            `${title}: ${gettext("Exporting Fidus file...")}`,
            {autoClose: false}
        )
        const progressCallback = (message, percentage) =>
            task.update(percentage, message)
        const getTemplateFiles = (docId, token) => {
            const templateExporter = new DocumentTemplateExporter(
                docId,
                "/api/document/get_template_for_doc/",
                false,
                token
            )
            return templateExporter.init().then(() => ({
                textFiles: templateExporter.textFiles,
                httpFiles: templateExporter.httpFiles
            }))
        }
        super(
            doc,
            bibDB,
            imageDB,
            includeTemplate,
            token,
            getTemplateFiles,
            progressCallback
        )
    }
}
