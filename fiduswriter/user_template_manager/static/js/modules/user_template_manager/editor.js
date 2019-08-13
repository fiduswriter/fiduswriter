import {DocumentTemplateDesigner} from "../document_template"
import {whenReady, postJson, setDocTitle, findTarget, post, addAlert} from "../common"
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
                this.bind()
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
                <div class="ui-dialog-buttonset">
                    <button type="button" class="fw-dark fw-button ui-button ui-corner-all ui-widget save">
                        ${gettext('Save')}
                    </button>
                    <button type="button" class="fw-orange fw-button ui-button ui-corner-all ui-widget close">
                        ${gettext('Close')}
                    </button>
                </div>
            </div>
        </div>`
        setDocTitle(gettext('Template Editor'), this.app)
        const feedbackTab = new FeedbackTab({staticUrl: this.staticUrl})
        feedbackTab.init()
    }

    showErrors(errors) {
        document.querySelector('#errors').innerHTML = Object.values(errors).map(error => `<li>${error}</li>`).join('')
    }

    save() {
        document.querySelector('#errors').innerHTML = ''
        const {valid, value, citationStyles, errors, hash, title} = this.templateDesigner.getCurrentValue()
        if (!valid) {
            this.showErrors(errors)
        } else {
            post('/api/user_template_manager/save/', {
                id: this.id,
                value: JSON.stringify(value),
                citation_styles: citationStyles,
                hash,
                title
            }).then(
                () => addAlert('info', gettext('Saved template'))
            )
        }
    }

    bind() {
        document.body.addEventListener('click', event => {
            const el = {}
            switch (true) {
                case findTarget(event, 'button.save', el):
                    event.preventDefault()
                    this.save()
                    break
                case findTarget(event, 'button.close', el):
                    event.preventDefault()
                    this.app.goTo('/templates/')
                    break
                default:
                    break
            }
        })
    }
}
