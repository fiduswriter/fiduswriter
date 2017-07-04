import {DocxExporter} from "../../exporter/docx"
import {OdtExporter} from "../../exporter/odt"

export class ModMenusActions {
    constructor(mod) {
        mod.actions = this
        this.mod = mod
    }

    downloadTemplateExport(templateUrl, templateType) {
        this.mod.editor.save().then(() => {
            if (templateType === 'docx') {
                new DocxExporter(
                    this.mod.editor.doc,
                    templateUrl,
                    this.mod.editor.bibDB,
                    this.mod.editor.imageDB
                )
            } else {
                new OdtExporter(
                    this.mod.editor.doc,
                    templateUrl,
                    this.mod.editor.bibDB,
                    this.mod.editor.imageDB
                )
            }

        })
    }

}
