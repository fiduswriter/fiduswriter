// Adds the templates overview page to the app routing table
export class DocTemplatesAppItem {
    constructor(app) {
        this.app = app
    }

    init() {
        this.app.routes['templates'] = {
          requireLogin: true,
          open: pathnameParts => {
              console.log(pathnameParts)
              if (pathnameParts.length < 4) {
                  return import("../../modules/doc_templates/overview").then(({DocTemplatesOverview}) => new DocTemplatesOverview(this.app.config))
              } else {
                  const id = pathnameParts[2]
                  return import("../../modules/doc_templates/editor").then(({DocTemplatesEditor}) => new DocTemplatesEditor(this.app.config, id))
              }
          }
        }
    }

}
