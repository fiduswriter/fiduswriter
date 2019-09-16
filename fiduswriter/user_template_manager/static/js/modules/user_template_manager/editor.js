import {DocumentTemplateDesigner} from "../document_template"
import {whenReady, postJson, setDocTitle, findTarget, post, addAlert, ensureCSS} from "../common"
import {FeedbackTab} from "../feedback"

export class DocTemplatesEditor {
    constructor({app, staticUrl, user}, idString) {
        this.app = app
        this.staticUrl = staticUrl
        this.user = user
        this.idString = idString
    }

    init() {
        ensureCSS([
            'errorlist.css',
            'editor.css',
            'user_template_manager.css'
        ], this.staticUrl)
        return postJson('/api/user_template_manager/get/', {id: this.idString}).then(
            ({json}) => {
                this.template = json.template
                this.id = json.template.id
                this.template.definition = JSON.parse(this.template.definition)

                return whenReady()
            }
        ).then(
            () => {
                this.render()
                this.templateDesigner = new DocumentTemplateDesigner(
                    {staticUrl: this.staticUrl},
                    this.id,
                    this.template.title,
                    this.template.definition,
                    this.template.document_styles,
                    this.template.export_templates,
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
        <nav id="headerbar"><div>
            <div id="close-document-top" title="${gettext('Close the template without saving and return to the overview')}">
                <span class="fw-link-text close">
                    <i class="fa fa-times"></i>
                </span>
            </div>
            <div id="document-top">
                <h1>${gettext('Template Editor')}</h1>
            </div>
        </div>
        <div>
            <div class="fw-contents">
                <div id="template-editor"></div>
                <ul class="errorlist"></ul>
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
        document.querySelector('.errorlist').innerHTML = Object.values(errors).map(error => `<li>${error}</li>`).join('')
    }

    save() {
        document.querySelector('.errorlist').innerHTML = ''
        const {valid, value, errors, import_id, title} = this.templateDesigner.getCurrentValue()
        if (!valid) {
            this.showErrors(errors)
        } else {
            post('/api/user_template_manager/save/', {
                id: this.id,
                value: JSON.stringify(value),
                import_id,
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
                case findTarget(event, 'button.close, span.close', el):
                    event.preventDefault()
                    this.app.goTo('/templates/')
                    break
                default:
                    break
            }
        })
    }
}
