import {DocumentTemplateDesigner} from "../document_template"
import {whenReady, postJson} from "../common"

export class DocTemplatesEditor {
    constructor({app, staticUrl, user}, idString) {
        this.app = app
        this.staticUrl = staticUrl
        this.user = user
        this.id = parseInt(idString)
    }

    init() {
        return postJson('/api/user_template_manager/get/', {id: this.id}).then(
            ({json}) => {
                this.template = json.template
                this.template.definition = JSON.parse(this.template.definition)
                this.citationStyles = json.citation_styles
                console.log({json})
                this.render()
                return whenReady()
            }
        ).then(
            () => {
                this.templateDesigner = new DocumentTemplateDesigner(
                    {staticUrl: this.staticUrl},
                    this.template.definition,
                    document.body.querySelector('#template-editor')
                )
                this.templateDesigner.init()
            }
        )
    }

    render() {
        document.body = document.createElement('body')
        document.body.innerHTML = `<div id="errors"></div>
        <div id="template-editor"><div id="other-elements"></div>`
    }
}
