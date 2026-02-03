import QRCode from "qrcode"
import {
    Dialog,
    activateWait,
    addAlert,
    deactivateWait,
    postJson
} from "../common"

export const twoFactorSetupDialog = () => {
    let secretKey = null
    let deviceId = null

    const buttons = [
        {
            text: gettext("Verify"),
            classes: "fw-dark",
            click: () => {
                const codeInput = document.querySelector("#two-factor-code")
                const code = codeInput.value.trim()

                if (code.length !== 6) {
                    addAlert("error", gettext("Please enter a 6-digit code."))
                    return
                }

                postJson("/api/user/two-factor/verify/", {
                    code,
                    device_id: deviceId
                })
                    .then(({json}) => {
                        if (json.status === "success") {
                            addAlert("success", json.message)
                            dialog.close()
                            window.location.reload()
                        } else {
                            addAlert("error", json.message)
                        }
                    })
                    .catch(() => {
                        addAlert("error", gettext("Could not verify the code."))
                    })
            }
        },
        {
            type: "cancel"
        }
    ]

    const dialog = new Dialog({
        id: "two-factor-setup-dialog",
        title: gettext("Set Up Two-Factor Authentication"),
        body: `<p>${gettext("Loading...")}</p>`,
        buttons: [],
        icon: "shield-alt",
        width: 500
    })

    dialog.open()

    // Load setup data
    activateWait(dialog.dialogEl)
    postJson("/api/user/two-factor/setup/").then(({json}) => {
        deactivateWait(dialog.dialogEl)

        if (json.status !== "success") {
            addAlert("error", json.message)
            dialog.close()
            return Promise.reject(json.message)
        }

        secretKey = json.secret_key
        deviceId = json.device_id
        const provisioningUri = json.provisioning_uri

        dialog.refreshButtons(buttons)

        const qrContainer = document.createElement("div")
        qrContainer.className = "two-factor-qr-container"

        QRCode.toCanvas(
            provisioningUri,
            {
                width: 200,
                margin: 2,
                color: {
                    dark: "#000000",
                    light: "#ffffff"
                }
            },
            function (error, canvas) {
                if (error) {
                    console.error("QR Code generation error:", error)
                    qrContainer.innerHTML = `<p style="color: red;">${gettext("Could not generate QR code. Please use the secret key below.")}</p>`
                } else {
                    qrContainer.appendChild(canvas)
                }
            }
        )

        dialog.dialogEl.querySelector(".ui-dialog-content").innerHTML = `
                <p>${gettext("Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)")}</p>
                <div class="two-factor-qr-wrapper"></div>
                <p><strong>${gettext("Or enter this code manually:")}</strong></p>
                <code class="two-factor-secret">${secretKey}</code>
                <div class="two-factor-verify-section">
                    <p>${gettext("Enter the 6-digit code from your authenticator app to verify:")}</p>
                    <input type="text" id="two-factor-code" placeholder="123456" maxlength="6" class="fw-button fw-large" autocomplete="one-time-code" />
                </div>
            `

        const qrWrapper = dialog.dialogEl.querySelector(
            ".two-factor-qr-wrapper"
        )
        if (qrWrapper && qrContainer) {
            qrWrapper.appendChild(qrContainer)
        }

        const codeInput = dialog.dialogEl.querySelector("#two-factor-code")
        if (codeInput) {
            codeInput.addEventListener("keypress", event => {
                if (event.key === "Enter") {
                    event.preventDefault()
                    buttons[0].click()
                }
            })
        }
    })

    return dialog
}

export const twoFactorDisableDialog = () => {
    const buttons = [
        {
            text: gettext("Disable 2FA"),
            classes: "fw-orange",
            click: () => {
                activateWait()
                postJson("/api/user/two-factor/disable/", {})
                    .then(({json}) => {
                        if (json.status === "success") {
                            addAlert("success", json.message)
                            dialog.close()
                            window.location.reload()
                        } else {
                            addAlert("error", json.message)
                        }
                    })
                    .catch(() => {
                        addAlert(
                            "error",
                            gettext(
                                "Could not disable two-factor authentication."
                            )
                        )
                    })
                    .then(() => {
                        deactivateWait()
                    })
            }
        },
        {
            type: "cancel"
        }
    ]

    const dialog = new Dialog({
        id: "two-factor-disable-dialog",
        title: gettext("Disable Two-Factor Authentication"),
        body: `<p>${gettext("Are you sure you want to disable two-factor authentication? This will reduce the security of your account.")}</p>`,
        buttons,
        icon: "exclamation-triangle"
    })

    dialog.open()
    return dialog
}

export const twoFactorLoginDialog = ({
    login,
    password,
    remember,
    loginPage
}) => {
    const _codeInputEvents = () => {
        const codeInput = dialog.dialogEl.querySelector("#two-factor-code")
        if (codeInput) {
            //codeInput.focus()
            codeInput.addEventListener("keypress", event => {
                if (event.key === "Enter") {
                    event.preventDefault()
                    buttons[0].click()
                }
            })
        }
    }

    const buttons = [
        {
            text: gettext("Verify"),
            classes: "fw-dark",
            click: () => {
                const twofactorInput =
                    dialog.dialogEl.querySelector("#two-factor-code")
                const twofactor = twofactorInput
                    ? twofactorInput.value.trim()
                    : ""

                if (twofactor.length !== 6) {
                    addAlert("error", gettext("Please enter a 6-digit code."))
                    return
                }

                activateWait()
                postJson("/api/user/login/", {
                    login,
                    password,
                    remember,
                    twofactor
                })
                    .then(({json}) => {
                        deactivateWait()
                        dialog.close()
                        loginPage.afterLogin(json)
                    })
                    .catch(() => {
                        addAlert("error", gettext("Could not verify the code."))
                        deactivateWait()
                    })
            }
        }
    ]

    const dialog = new Dialog({
        id: "two-factor-login-dialog",
        title: gettext("Two-Factor Authentication"),
        body: `<p>${gettext("Enter the 6-digit code from your authenticator app:")}</p>
            <input type="text" id="two-factor-code" placeholder="123456" maxlength="6" class="fw-button fw-large" autocomplete="one-time-code" autofocus />`,
        buttons,
        icon: "shield-alt",
        width: 500
    })

    dialog.open()
    const codeInput = dialog.dialogEl.querySelector("#two-factor-code")
    if (codeInput) {
        //codeInput.focus()
        codeInput.addEventListener("keypress", event => {
            if (event.key === "Enter") {
                event.preventDefault()
                buttons[0].click()
            }
        })
    }
    //codeInputEvents()
    return dialog
}

export const checkTwoFactorStatus = () => {
    return postJson("/api/user/two-factor/status/")
        .then(({json}) => {
            if (json.status === "success") {
                return json.enabled
            }
            return false
        })
        .catch(() => false)
}
