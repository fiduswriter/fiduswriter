// Adds the templates overview page to the app routing table
import {
    DocTemplatesEditor,
    DocTemplatesOverview
} from "@fiduswriter/frontend/document_templates"

export class DocTemplatesAppItem {
    constructor(app) {
        this.app = app
    }

    init() {
        this.app.routes["templates"] = {
            requireLogin: true,
            open: pathnameParts => {
                if (pathnameParts.length < 4) {
                    return Promise.resolve(
                        new DocTemplatesOverview(this.app.config)
                    )
                } else {
                    const id = pathnameParts[2]
                    return Promise.resolve(
                        new DocTemplatesEditor(this.app.config, id)
                    )
                }
            },
            dbTables: {
                list: {
                    keyPath: "id"
                }
            }
        }
    }
}
