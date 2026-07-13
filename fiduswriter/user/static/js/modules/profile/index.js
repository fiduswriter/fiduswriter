import {baseBodyTemplate} from "@fiduswriter/common/common"
import {FeedbackTab} from "@fiduswriter/common/feedback"
import {SiteMenu} from "@fiduswriter/common/menu"
import {
    activateWait,
    addAlert,
    deactivateWait,
    dropdownSelect,
    ensureCSS,
    findTarget,
    post,
    setDocTitle,
    whenReady
} from "fwtoolkit"
import {plugins} from "../../plugins/profile"
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
        this.pluginTemplates = []
        this.clickTargets = {
            "#add-profile-email": (_el, _event) => addEmailDialog(this.app),
            "#fw-edit-profile-pwd": (_el, _event) =>
                changePwdDialog({username: this.user.username}),
            "#delete-account": (_el, _event) => {
                const dialog = new DeleteUserDialog(
                    this.dom.querySelector("#delete-account").dataset.username
                )
                dialog.init()
            },
            "#submit-profile": (_el, _event) => this.save(),
            ".delete-email": (el, _event) =>
                deleteEmailDialog(el.target, this.app),
            ".delete-socialaccount": (el, _event) =>
                deleteSocialaccountDialog(el.target, this.app)
        }

        this.postRenderHandlers = [
            () => {
                dropdownSelect(
                    this.dom.querySelector("#edit-avatar-pulldown"),
                    {
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
                    }
                )
            },
            () => {
                this.dom
                    .querySelectorAll(".primary-email-radio")
                    .forEach(el =>
                        el.addEventListener("change", () =>
                            changePrimaryEmailDialog(this.app)
                        )
                    )
            }
        ]
        if (this.app.settings.TWO_FACTOR_ENABLED) {
            this.clickTargets["#setup-two-factor"] = (_el, _event) => {
                twoFactorSetupDialog()
            }
            this.clickTargets["#disable-two-factor"] = (_el, _event) => {
                twoFactorDisableDialog()
            }

            // Check and display two-factor authentication status
            this.postRenderHandlers.push(() => this.updateTwoFactorStatus())
        }
        if (
            this.app.settings.E2EE_MODE &&
            this.app.settings.E2EE_MODE !== "disabled"
        ) {
            this.clickTargets["#setup-e2ee-passphrase"] = (_el, _event) => {
                this.setupE2EEPassphrase()
            }
            this.clickTargets["#change-e2ee-passphrase"] = (_el, _event) => {
                this.changeE2EEPassphrase()
            }
            this.clickTargets["#recover-e2ee-passphrase"] = (_el, _event) => {
                this.recoverE2EEPassphrase()
            }

            // Check and display E2EE passphrase status
            this.postRenderHandlers.push(() =>
                this.updateE2EEPassphraseStatus()
            )
        }
    }

    init() {
        return whenReady().then(() => {
            this.activateFidusPlugins()
            this.render()
            const smenu = new SiteMenu(this.app, "") // Nothing highlighted
            smenu.init()
            this.dom.addEventListener("click", event => {
                const el = {}
                Object.entries(this.clickTargets).find(
                    ([selector, handler]) => {
                        if (findTarget(event, selector, el)) {
                            handler(el, event)
                            return true
                        }
                    }
                )
            })
            this.postRenderHandlers.forEach(handler => handler())
        })
    }

    activateFidusPlugins() {
        if (this.plugins) {
            // Plugins have been activated already
            return
        }
        // Add plugins.
        this.plugins = {}

        plugins.forEach(([app, plugin]) => {
            if (!this.app.settings.APPS.includes(app)) {
                return
            }
            Object.values(plugin).forEach(pluginExport => {
                if (typeof pluginExport === "function") {
                    this.plugins[pluginExport.name] = new pluginExport(this)
                    this.plugins[pluginExport.name].init()
                }
            })
        })
    }

    render() {
        this.dom = document.createElement("body")
        this.dom.classList.add("fw-scrollable")
        this.dom.innerHTML = baseBodyTemplate({
            contents: profileContents(
                this.user,
                this.socialaccount_providers,
                this.app.settings,
                this.pluginTemplates
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
        import("@fiduswriter/editor/e2ee/passphrase-manager.js").then(
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
            "@fiduswriter/editor/e2ee/passphrase-manager.js"
        )
        const {setupPassphraseDialog} = await import(
            "@fiduswriter/editor/e2ee/passphrase-dialog.js"
        )

        setupPassphraseDialog(async passphrase => {
            try {
                const {recoveryKey} =
                    await PassphraseManager.setupEncryption(passphrase)
                const {showRecoveryKeyDialog} = await import(
                    "@fiduswriter/editor/e2ee/passphrase-dialog.js"
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
            "@fiduswriter/editor/e2ee/passphrase-manager.js"
        )
        const {recoverWithKeyDialog, showRecoveryKeyDialog} = await import(
            "@fiduswriter/editor/e2ee/passphrase-dialog.js"
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
            "@fiduswriter/editor/e2ee/passphrase-manager.js"
        )
        const {changePassphraseDialog} = await import(
            "@fiduswriter/editor/e2ee/passphrase-dialog.js"
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
        const inlineReferences =
            this.dom.querySelector("#inline-references").checked
        const inlineMath = this.dom.querySelector("#inline-math").checked
        return post("/api/user/save/", {
            username: this.dom.querySelector("#username").value,
            first_name: this.dom.querySelector("#first_name").value,
            last_name: this.dom.querySelector("#last_name").value,
            language: newLang
        })
            .catch(() =>
                addAlert("error", gettext("Could not save profile data"))
            )
            .then(() =>
                post("/api/user/preferences/update/", {
                    inline_references: inlineReferences,
                    inline_math: inlineMath
                })
            )
            .catch(() =>
                addAlert("error", gettext("Could not save preferences"))
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
