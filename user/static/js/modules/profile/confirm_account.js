import {whenReady, post, activateWait, deactivateWait} from "../common"
import {confirmAccountTemplate, verifiedAccountTemplate, checkTermsTemplate, testServerQuestionTemplate} from "./templates"
import * as plugins from "../../plugins/confirm_account"


export class ConfirmAccount {
    constructor(confirmationData, testServer) {
        this.confirmationData = confirmationData
        this.testServer = testServer
        this.submissionReady = false
        this.formChecks = [
            () => document.getElementById('terms-check').matches(':checked')
        ]
        this.confirmQuestionsTemplates = [checkTermsTemplate]
        this.confirmMethods = []
        if (confirmationData.confirmed) {
            this.confirmMethods.push(
                () => post(this.confirmationData.submissionUrl)
            )
        }
        if (testServer) {
            this.formChecks.push(
                () => document.getElementById('test-check').matches(':checked')
            )
            this.confirmQuestionsTemplates.push(testServerQuestionTemplate)
        }
    }

    init() {
        this.activateFidusPlugins()
        whenReady().then(() => {
            this.setFormHTML()
            this.bind()
        })
    }

    bind() {
        if (!this.confirmationData.confirmed) {
            return
        }
        document.querySelectorAll('.checker').forEach(el => el.addEventListener(
            'click',
            () => {
                if (this.formChecks.every(check => check())) {
                    document.getElementById('submit').removeAttribute("disabled")
                    this.submissionReady = true
                } else {
                    document.getElementById('submit').setAttribute("disabled", "disabled")
                    this.submissionReady = false
                }
            }
        ))
        let submissionButton = document.getElementById('submit')
        submissionButton.addEventListener('click', event => {
            if (!this.submissionReady) {
                return
            }
            activateWait()
            Promise.all(this.confirmMethods.map(method => method())).then(
                () => {
                    deactivateWait()
                    this.setVerifiedHTML()
                }
            )
        })
    }

    activateFidusPlugins() {
        // Add plugins.
        this.plugins = {}

        Object.keys(plugins).forEach(plugin => {
            if (typeof plugins[plugin] === 'function') {
                this.plugins[plugin] = new plugins[plugin](this)
                this.plugins[plugin].init()
            }
        })
    }

    setFormHTML() {
        let contentsDOM = document.querySelector('.fw-contents')
        contentsDOM.innerHTML = confirmAccountTemplate({confirmationData: this.confirmationData, confirmQuestionsTemplates: this.confirmQuestionsTemplates})
    }

    setVerifiedHTML() {
        let contentsDOM = document.querySelector('.fw-contents')
        contentsDOM.innerHTML = verifiedAccountTemplate()
    }

}
