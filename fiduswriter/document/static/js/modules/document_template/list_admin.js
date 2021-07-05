import {whenReady, findTarget, escapeText, ensureCSS} from "../common"
import {DocumentTemplateDownloader} from "./download"
import {DocumentTemplateUploader} from "./upload"


export class DocumentTemplateListAdmin {
    constructor() {
        this.objectTools = false
        this.actionDropdown = false
    }

    init() {
        if (
            window.location.search.length &&
            window.location.search.includes('debug=true')
        ) {
            return
        }
        ensureCSS([
            'document_template_admin.css',
            'admin.css'
        ])

        whenReady().then(() => {
            this.objectTools = document.querySelector('ul.object-tools')
            this.actionDropdown = document.querySelector('select[name="action"]')
            this.modifyDOM()
            this.bind()
        })
    }

    modifyDOM() {
        this.objectTools.insertAdjacentHTML(
            'beforeend',
            `<li>
                <span class="link" id="upload-template">${gettext('Upload Document Template')}</span>
            </li>`
        )
        this.actionDropdown.insertAdjacentHTML(
            'beforeend',
            `<option value="download">${gettext('Download selected document templates')}</option>`
        )
    }

    showErrors(errors) {
        this.templateDesignerBlock.querySelector('ul.errorlist').innerHTML =
            Object.values(errors).map(error => `<li>${escapeText(error)}</li>`).join('')
    }


    bind() {

        document.body.addEventListener('click', event => {
            const el = {}
            switch (true) {
            case findTarget(event, '#upload-template', el):
            {
                event.preventDefault()
                const fileSelector = document.createElement('input')
                fileSelector.setAttribute('type', 'file')
                fileSelector.setAttribute('multiple', '')
                fileSelector.setAttribute('accept', '.fidustemplate')
                fileSelector.click()
                fileSelector.addEventListener('change', () => {
                    const files = Array.from(fileSelector.files).filter(file => {
                        //TODO: This is an arbitrary size. What should be done with huge import files?
                        if (file.length === 0 || file.size > 104857600) {
                            return false
                        }
                        return true
                    })
                    Promise.all(files.map(file => {
                        const uploader = new DocumentTemplateUploader(file)
                        return uploader.init()
                    })).then(
                        () => window.location.reload()
                    )
                })
                break
            }
            case findTarget(event, 'button[type=submit]', el):
                if (this.actionDropdown.value === 'download') {
                    event.preventDefault()
                    const ids = Array.from(document.querySelectorAll('#result_list tr.selected input[type="checkbox"]')).map(
                        el => parseInt(el.value)
                    )
                    ids.forEach(id => {
                        const downloader = new DocumentTemplateDownloader(id)
                        downloader.init()
                    })
                }
                break
            default:
                break
            }
        })
    }
}
