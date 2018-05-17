import {whenReady, post} from "../common"
import {confirmAccountTemplate, verifiedAccountTemplate} from "./templates"

export class ConfirmAccount {
    constructor(confirmationData, testServer) {
        this.confirmationData = confirmationData
        this.testServer = testServer
        this.submissionReady = false
    }

    init() {
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
                let testCheck = false
                if (document.getElementById('test-check')) {
                    if (document.getElementById('test-check').matches(':checked')) {
                        testCheck = true
                    }
                } else {
                    testCheck = true
                }
                if (testCheck && document.getElementById('terms-check').matches(':checked')) {
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
            post(this.confirmationData.submissionUrl).then(
                () => this.setVerifiedHTML()
            )
        })
    }

    setFormHTML() {
        let contentsDOM = document.querySelector('.fw-contents')
        contentsDOM.innerHTML = confirmAccountTemplate({confirmationData: this.confirmationData, testServer: this.testServer})
    }

    setVerifiedHTML() {
        let contentsDOM = document.querySelector('.fw-contents')
        contentsDOM.innerHTML = verifiedAccountTemplate()
    }

}
