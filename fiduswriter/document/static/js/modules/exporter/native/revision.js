import {SaveRevision as GenericSaveRevision} from "@fiduswriter/document/exporter/native"
import {createSlug} from "@fiduswriter/document/exporter/tools/file"
import {addAlert, addProgress, gettext, post, shortFileTitle} from "fwtoolkit"
import {DocumentTemplateExporter} from "../../document_template/exporter"

export class SaveRevision extends GenericSaveRevision {
    constructor(doc, imageDB, bibDB, note, app) {
        const title = shortFileTitle(doc.title, doc.path || "")
        const task = addProgress(
            "info",
            `${title}: ${gettext("Saving revision...")}`,
            {autoClose: false}
        )
        const progressCallback = (message, percentage) =>
            task.update(percentage, message)

        const onError = error => {
            task.close()
            addAlert("error", gettext("Revision file could not be generated."))
            if (app.isOffline()) {
                addAlert(
                    "info",
                    gettext(
                        "You are currently offline. Please try again when you are back online."
                    )
                )
            } else {
                throw error
            }
        }

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

        const uploadRevision = (blob, doc) => {
            return post(
                "/api/document/upload/",
                {
                    note,
                    document_id: doc.id
                },
                {
                    file: {
                        file: blob,
                        filename: `${createSlug(
                            shortFileTitle(doc.title, doc.path)
                        )}.fidus`
                    }
                }
            )
                .then(
                    () => {},
                    () => {
                        if (app.isOffline()) {
                            addAlert(
                                "info",
                                gettext(
                                    "You are currently offline. Please try again when you are back online."
                                )
                            )
                        }
                        throw new Error(gettext("Revision could not be saved."))
                    }
                )
                .catch(error => {
                    throw error
                })
        }

        super(doc, imageDB, bibDB, note, uploadRevision, {
            getTemplateFiles,
            onError,
            progressCallback
        })
    }
}
