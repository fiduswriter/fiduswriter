import {DocumentTemplateDesigner} from "../document_template"
import {whenReady, postJson, setDocTitle} from "../common"
import {FeedbackTab} from "../feedback"

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
                this.citationStyles = json.citation_styles.map(
                    style => ({
                        title: style.fields.title,
                        id: style.pk,
                        selected: this.template.citation_styles.includes(style.pk)
                    })
                )
                // console.log({json})
                return whenReady()
            }
        ).then(
            () => {
                this.render()
                this.templateDesigner = new DocumentTemplateDesigner(
                    {staticUrl: this.staticUrl},
                    this.template.title,
                    this.template.definition,
                    this.citationStyles,
                    document.body.querySelector('#template-editor')
                )
                this.templateDesigner.init()
            }
        )
    }

    render() {
        document.body = document.createElement('body')
        document.body.innerHTML =
        `<div id="wait" class="">
            <i class="fa fa-spinner fa-pulse"></i>
        </div>
        <header class="fw-header">
            <div class="fw-container">
                <h1 class="fw-logo"><span class="fw-logo-text"></span><img src="${this.staticUrl}svg/icon.svg?v=${process.env.TRANSPILE_VERSION}"></h1>
            </div>
        </header>
        <div class="fw-contents-outer">
            <div class="fw-contents">
                <h1>${gettext('Template Editor')}</h1>
                <div id="template-editor"></div>
                <div id="errors"></div>
                <div id="other-elements"></div>
            </div>
        </div>`
        setDocTitle(gettext('Template Editor'), this.app)
        const feedbackTab = new FeedbackTab({staticUrl: this.staticUrl})
        feedbackTab.init()
    }
}
