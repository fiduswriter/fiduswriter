import {
    activateWait,
    addAlert,
    baseBodyTemplate,
    deactivateWait,
    dropdownSelect,
    ensureCSS,
    findTarget,
    jsonPost,
    setDocTitle,
    whenReady
} from "../common"
import {FeedbackTab} from "../feedback"
import {SiteMenu} from "../menu"
import {
    checkTwoFactorStatus,
    twoFactorDisableDialog,
    twoFactorSetupDialog
} from "../two_factor"
import {DeleteUserDialog} from "./delete_user"
import {
    addEmailDialog,
    changeAvatarDialog,
    changePrimaryEmailDialog,
    changePwdDialog,
    deleteAvatarDialog,
    deleteEmailDialog,
    deleteSocialaccountDialog
} from "./dialogs"
import {profileContents} from "./templates"

export class Profile {
    constructor({app, user, socialaccount_providers}) {
        this.app = app
        this.user = user
        this.socialaccount_providers = socialaccount_providers
    }

    init() {
        return whenReady().then(() => {
            this.render()
            const smenu = new SiteMenu(this.app, "") // Nothing highlighted
            smenu.init()
            dropdownSelect(this.dom.querySelector("#edit-avatar-pulldown"), {
                onChange: value => {
                    switch (value) {
                        case "change":
                            changeAvatarDialog(this.app)
                            break
                        case "delete":
                            deleteAvatarDialog(this.app)
                            break
                    }
                },
                button: this.dom.querySelector("#edit-avatar-btn")
            })
            this.dom.addEventListener("click", event => {
                const el = {}
                let dialog
                switch (true) {
                    case findTarget(event, "#add-profile-email", el):
                        addEmailDialog(this.app)
                        break
                    case findTarget(event, "#fw-edit-profile-pwd", el):
                        changePwdDialog({username: this.user.username})
                        break
                    case findTarget(event, "#delete-account", el):
                        dialog = new DeleteUserDialog(
                            this.dom.querySelector("#delete-account").dataset
                                .username
                        )
                        dialog.init()
                        break
                    case findTarget(event, "#submit-profile", el):
                        this.save()
                        break
                    case findTarget(event, ".delete-email", el):
                        deleteEmailDialog(el.target, this.app)
                        break
                    case findTarget(event, ".delete-socialaccount", el):
                        deleteSocialaccountDialog(el.target, this.app)
                        break
                    case this.app.settings.TWO_FACTOR_ENABLED &&
                        findTarget(event, "#setup-two-factor", el):
                        dialog = twoFactorSetupDialog()
                        break
                    case this.app.settings.TWO_FACTOR_ENABLED &&
                        findTarget(event, "#disable-two-factor", el):
                        dialog = twoFactorDisableDialog()
                        break
                    case this.app.settings.E2EE_MODE !== "disabled" &&
                        findTarget(event, "#setup-e2ee-passphrase", el):
                        this.setupE2EEPassphrase()
                        break
                    case this.app.settings.E2EE_MODE !== "disabled" &&
                        findTarget(event, "#change-e2ee-passphrase", el):
                        this.changeE2EEPassphrase()
                        break
                    case this.app.settings.E2EE_MODE !== "disabled" &&
                        findTarget(event, "#recover-e2ee-passphrase", el):
                        this.recoverE2EEPassphrase()
                        break
                    default:
                        break
                }
            })
            this.dom
                .querySelectorAll(".primary-email-radio")
                .forEach(el =>
                    el.addEventListener("change", () =>
                        changePrimaryEmailDialog(this.app)
                    )
                )
            // Check and display two-factor authentication status
            if (this.app.settings.TWO_FACTOR_ENABLED) {
                this.updateTwoFactorStatus()
            }
            // Check and display E2EE passphrase status
            if (this.app.settings.E2EE_MODE !== "disabled") {
                this.updateE2EEPassphraseStatus()
            }
        })
    }

    render() {
        this.dom = document.createElement("body")
        this.dom.classList.add("scrollable")
        this.dom.innerHTML = baseBodyTemplate({
            contents: profileContents(
                this.user,
                this.socialaccount_providers,
                this.app.settings
            ),
            user: this.user,
            app: this.app
        })
        document.body = this.dom

        ensureCSS([
            staticUrl("css/show_profile.css"),
            staticUrl("css/two_factor.css")
        ])

        setDocTitle(gettext("Configure profile"), this.app)
        const feedbackTab = new FeedbackTab()
        feedbackTab.init()
    }

    updateTwoFactorStatus() {
        checkTwoFactorStatus().then(enabled => {
            const enabledStatus = this.dom.querySelector(
                "#two-factor-enabled-status"
            )
            const disabledStatus = this.dom.querySelector(
                "#two-factor-disabled-status"
            )
            const setupBtn = this.dom.querySelector("#setup-two-factor")
            const disableBtn = this.dom.querySelector("#disable-two-factor")

            if (enabled) {
                enabledStatus.style.display = "inline"
                disabledStatus.style.display = "none"
                setupBtn.style.display = "none"
                disableBtn.style.display = "inline"
            } else {
                enabledStatus.style.display = "none"
                disabledStatus.style.display = "inline"
                setupBtn.style.display = "inline"
                disableBtn.style.display = "none"
            }
        })
    }

    updateE2EEPassphraseStatus() {
        import("../editor/e2ee/passphrase-manager.js").then(
            ({PassphraseManager}) => {
                PassphraseManager.hasEncryptionKeys().then(hasKeys => {
                    const enabledStatus = this.dom.querySelector(
                        "#e2ee-passphrase-enabled-status"
                    )
                    const disabledStatus = this.dom.querySelector(
                        "#e2ee-passphrase-disabled-status"
                    )
                    const setupBtn = this.dom.querySelector(
                        "#setup-e2ee-passphrase"
                    )
                    const changeBtn = this.dom.querySelector(
                        "#change-e2ee-passphrase"
                    )
                    const recoverBtn = this.dom.querySelector(
                        "#recover-e2ee-passphrase"
                    )

                    if (hasKeys) {
                        enabledStatus.style.display = "inline"
                        disabledStatus.style.display = "none"
                        setupBtn.style.display = "none"
                        changeBtn.style.display = "inline"
                        recoverBtn.style.display = "inline"
                    } else {
                        enabledStatus.style.display = "none"
                        disabledStatus.style.display = "inline"
                        setupBtn.style.display = "inline"
                        changeBtn.style.display = "none"
                        recoverBtn.style.display = "none"
                    }
                })
            }
        )
    }

    async setupE2EEPassphrase() {
        const {PassphraseManager} = await import(
            "../editor/e2ee/passphrase-manager.js"
        )
        const {setupPassphraseDialog} = await import(
            "../editor/e2ee/passphrase-dialog.js"
        )

        setupPassphraseDialog(async passphrase => {
            try {
                const {recoveryKey} =
                    await PassphraseManager.setupEncryption(passphrase)
                const {showRecoveryKeyDialog} = await import(
                    "../editor/e2ee/passphrase-dialog.js"
                )
                await showRecoveryKeyDialog(recoveryKey)
                this.updateE2EEPassphraseStatus()
            } catch (e) {
                addAlert(
                    "error",
                    gettext("Failed to set up passphrase: ") + e.message
                )
            }
        })
    }

    async recoverE2EEPassphrase() {
        const {PassphraseManager} = await import(
            "../editor/e2ee/passphrase-manager.js"
        )
        const {recoverWithKeyDialog, showRecoveryKeyDialog} = await import(
            "../editor/e2ee/passphrase-dialog.js"
        )

        const recoverResult = await new Promise(resolve => {
            recoverWithKeyDialog(resolve)
        })
        if (!recoverResult) {
            return
        }
        try {
            const {newRecoveryKey} =
                await PassphraseManager.recoverWithRecoveryKey(
                    recoverResult.recoveryKey,
                    recoverResult.newPassphrase
                )
            await new Promise(resolve => {
                showRecoveryKeyDialog(newRecoveryKey, resolve)
            })
            this.updateE2EEPassphraseStatus()
        } catch (e) {
            addAlert("error", gettext("Recovery failed: ") + e.message)
        }
    }

    async changeE2EEPassphrase() {
        const {PassphraseManager} = await import(
            "../editor/e2ee/passphrase-manager.js"
        )
        const {changePassphraseDialog} = await import(
            "../editor/e2ee/passphrase-dialog.js"
        )

        const changeResult = await new Promise(resolve => {
            changePassphraseDialog(resolve)
        })
        if (!changeResult) {
            return
        }
        try {
            await PassphraseManager.changePassphrase(
                changeResult.oldPassphrase,
                changeResult.newPassphrase
            )
            addAlert("success", gettext("Passphrase changed successfully."))
        } catch (e) {
            addAlert(
                "error",
                gettext("Failed to change passphrase: ") + e.message
            )
        }
    }

    save() {
        activateWait()
        const newLang = this.dom.querySelector("#language").value
        return jsonPost("/api/user/save/", {
            form_data: {
                user: {
                    username: this.dom.querySelector("#username").value,
                    first_name: this.dom.querySelector("#first_name").value,
                    last_name: this.dom.querySelector("#last_name").value,
                    language: newLang
                }
            }
        })
            .catch(() =>
                addAlert("error", gettext("Could not save profile data"))
            )
            .then(() => {
                deactivateWait()
                return this.app.getConfiguration()
            })
            .then(() => {
                const currentLang = document.documentElement.lang

                if (currentLang !== newLang) {
                    // Refresh the page to use the new language
                    window.location.reload()
                }
            })
    }
}
