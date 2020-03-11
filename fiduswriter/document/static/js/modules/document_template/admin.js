import {whenReady, findTarget, postJson, escapeText, ensureCSS} from "../common"
import {DocumentTemplateDesigner} from "./designer"
import {CSL} from "citeproc-plus"

export class DocumentTemplateAdmin {
    constructor() {
        this.definitionTextarea = false
        this.templateDesigner = false
        this.templateExtras = false
        this.citationStyles = false
        const locationParts = window.location.href.split('/')
        let id = parseInt(locationParts[locationParts.length-3])
        if (isNaN(id)) {
            id = 0
        }
        this.id = id
    }

    init() {
        ensureCSS([
            'colors.css',
            'document_template_designer_admin.css',
            'admin.css',
            'ui_dialogs.css',
            'buttons.css'
        ])
        const csl = new CSL()
        const initialTasks = [
            whenReady(),
            csl.getStyles().then(
                styles => this.citationStyles = styles
            )
        ]
        if (this.id) {
            initialTasks.push(
                postJson('/api/document/admin/get_template_extras/', {id: this.id}).then(
                    ({json}) => this.templateExtras = json
                )
            )
        }

        Promise.all(initialTasks).then(() => {
            this.titleInput = document.querySelector('#id_title')
            this.titleBlock = document.querySelector('div.field-title')
            this.definitionTextarea = document.querySelector('textarea[name=definition]')
            this.definitionImportIdInput = document.querySelector('#id_import_id')
            this.definitionImportIdBlock = document.querySelector('div.field-import_id')
            this.definitionBlock = document.querySelector('div.field-definition')
            this.modifyDOM()
            this.initDesigner()
            this.bind()
        })
    }

    initDesigner() {
        this.templateDesigner = new DocumentTemplateDesigner(
            this.id,
            this.titleInput.value,
            JSON.parse(this.definitionTextarea.value),
            this.templateExtras.document_styles || [],
            this.citationStyles,
            this.templateExtras.export_templates || [],
            document.getElementById('template-editor')
        )
        this.templateDesigner.init()
    }

    modifyDOM() {
        this.definitionBlock.style.display='none'
        this.definitionImportIdBlock.style.display='none'
        this.titleBlock.style.display='none'
        this.titleBlock.insertAdjacentHTML(
            'beforebegin',
            `<div class="form-row"><ul class="object-tools right">
                <li>
                    <span class="link" id="toggle-editor">${gettext('Source/Editor')}</span>
                </li>
            </ul></div>
            <div class="form-row template-editor">
                <ul class="errorlist"></ul>
                <div id="template-editor"></div>
            </div>`
        )

        this.templateDesignerBlock = document.querySelector('div.template-editor')
    }

    setCurrentValue() {
        const {valid, value, errors, import_id, title} = this.templateDesigner.getCurrentValue()
        this.definitionTextarea.value = JSON.stringify(value)
        this.definitionImportIdInput.value = import_id
        this.titleInput.value = title
        this.showErrors(errors)
        return valid
    }

    showErrors(errors) {
        this.templateDesignerBlock.querySelector('ul.errorlist').innerHTML =
            Object.values(errors).map(error => `<li>${escapeText(error)}</li>`).join('')
    }


    bind() {

        document.body.addEventListener('click', event => {
            const el = {}
            switch (true) {
                case findTarget(event, '#toggle-editor', el):
                    event.preventDefault()
                    if (this.definitionBlock.style.display==='none') {
                        this.definitionBlock.style.display=''
                        this.definitionImportIdBlock.style.display=''
                        this.titleBlock.style.display=''
                        this.setCurrentValue()
                        this.templateDesigner.close()
                        this.templateDesigner = false
                        this.templateDesignerBlock.style.display='none'
                    } else {
                        this.definitionBlock.style.display='none'
                        this.definitionImportIdBlock.style.display='none'
                        this.titleBlock.style.display='none'
                        this.templateDesignerBlock.style.display=''
                        this.initDesigner()
                    }
                    break
                case findTarget(event, 'div.submit-row input[type=submit]', el):
                    if (this.definitionBlock.style.display==='none' && !this.setCurrentValue()) {
                        event.preventDefault()
                    }
                    break
                default:
                    break
            }
        })
    }
}
