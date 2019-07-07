import {whenReady, post, activateWait, deactivateWait, postJson} from "../common"
import {confirmAccountTemplate, verifiedAccountTemplate, checkTermsTemplate, testServerQuestionTemplate} from "./templates"
import {PreloginPage} from "../prelogin"
import * as pluginLoaders from "../../plugins/confirm_account"

export class EmailConfirm extends PreloginPage {
    constructor({app, isFree, language, registrationOpen, testServer, staticUrl}, key) {
        super({app, isFree, language, registrationOpen, staticUrl})
        this.testServer = testServer

        this.title = gettext('Confirm Email')
        this.pluginLoaders = pluginLoaders

        this.key = key

        this.validKey = false
        this.username = ''
        this.email = ''

        this.submissionReady = false
        this.formChecks = [
            () => document.getElementById('terms-check').matches(':checked')
        ]
        this.confirmQuestionsTemplates = [checkTermsTemplate]
        this.confirmMethods = [() => post(`/api/user/confirm-email/${this.key}/`)]
        if (this.testServer) {
            this.formChecks.push(
                () => document.getElementById('test-check').matches(':checked')
            )
            this.confirmQuestionsTemplates.push(testServerQuestionTemplate)
        }
    }

    init() {
        return Promise.all([
            whenReady(),
            this.getConfirmData(),
        ]).then(() => {
            this.activateFidusPlugins()
            this.render()
            this.bind()
        })
    }

    getConfirmData() {
        return postJson('/api/user/get_confirmkey_data/', {key: this.key}).then(
            ({json}) => {
                this.username = json.username
                this.email = json.email
                this.validKey = true
            }
        ).catch(()=> {})
    }

    render() {
        this.contents = confirmAccountTemplate({validKey: this.validKey, username: this.username, email: this.email, confirmQuestionsTemplates: this.confirmQuestionsTemplates})
        super.render()
    }

    bind() {
        super.bind()
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
        const submissionButton = document.getElementById('submit')
        submissionButton.addEventListener('click', () => {
            if (!this.submissionReady) {
                return
            }
            activateWait()
            Promise.all(this.confirmMethods.map(method => method())).then(
                () => {
                    deactivateWait()
                    const contentsDOM = document.querySelector('.fw-contents')
                    contentsDOM.innerHTML = verifiedAccountTemplate()
                }
            )
        })
    }

}
