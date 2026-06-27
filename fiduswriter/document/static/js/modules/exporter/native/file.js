import {ExportFidusFile as GenericExportFidusFile} from "@fiduswriter/document/exporter/native"
import {DocumentTemplateExporter} from "../../document_template/exporter"

export class ExportFidusFile extends GenericExportFidusFile {
    constructor(doc, bibDB, imageDB, includeTemplate = true, token = false) {
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
        super(doc, bibDB, imageDB, includeTemplate, token, getTemplateFiles)
    }
}
