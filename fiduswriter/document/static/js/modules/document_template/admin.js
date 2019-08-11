import {
    toggleEditorButtonTemplate,
} from "./templates"
import {whenReady, findTarget} from "../common"
import {DocumentTemplateDesigner} from "./designer"

export class DocumentTemplateAdmin {
    constructor({staticUrl}) {
        this.staticUrl = staticUrl
        this.definitionTextarea = false
        this.templateDesigner = false
    }

    init() {
        whenReady().then(() => {
            this.definitionTextarea = document.querySelector('textarea[name=definition]')
            this.definitionHashInput = document.querySelector('#id_definition_hash')
            this.definitionHashInputBlock = document.querySelector('div.field-definition_hash')
            this.modifyDOM()
            this.initDesigner()
            this.bind()
        })
    }

    initDesigner() {
        this.templateDesigner = new DocumentTemplateDesigner(
            {staticUrl: this.staticUrl},
            this.getInitialValue(),
            document.getElementById('template-editor')
        )
        this.templateDesigner.init()
    }

    modifyDOM() {
        this.definitionTextarea.style.display='none'
        this.definitionHashInputBlock.style.display='none'
        this.definitionTextarea.insertAdjacentHTML(
            'beforebegin',
            toggleEditorButtonTemplate()
        )

        this.definitionTextarea.insertAdjacentHTML(
            'afterend',
            '<ul class="errorlist"></ul><div id="template-editor"></div>'
        )
    }

    getInitialValue() {
        return JSON.parse(this.definitionTextarea.value)
    }

    setCurrentValue() {
        const {valid, value, errors, hash} = this.templateDesigner.getCurrentValue()
        this.definitionTextarea.value = JSON.stringify(value)
        this.definitionHashInput.value = hash
        this.showErrors(errors)
        return valid
    }

    showErrors(errors) {
        this.definitionTextarea.parentElement.querySelector('ul.errorlist').innerHTML =
            Object.values(errors).map(error => `<li>${error}</li>`).join('')
    }


    bind() {

        document.body.addEventListener('click', event => {
            const el = {}
            switch (true) {
                case findTarget(event, '#toggle-editor', el):
                    event.preventDefault()
                    if (this.definitionTextarea.style.display==='none') {
                        this.definitionTextarea.style.display=''
                        this.definitionHashInputBlock.style.display=''
                        this.setCurrentValue()
                        this.templateDesigner.close()
                        this.templateDesigner = false

                    } else {
                        this.definitionTextarea.style.display='none'
                        this.definitionHashInputBlock.style.display='none'
                        this.initDesigner()
                    }
                    break
                case findTarget(event, 'div.submit-row input[type=submit]', el):
                    if (this.definitionTextarea.style.display==='none' && !this.setCurrentValue()) {
                        event.preventDefault()
                    }
                    break
                default:
                    break
            }
        })
    }
}
