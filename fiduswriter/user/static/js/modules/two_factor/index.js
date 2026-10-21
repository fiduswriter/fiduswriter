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

    // Load setup data
    activateWait()
    return postJson("/api/user/two-factor/setup/").then(({json}) => {
        deactivateWait()

        if (json.status !== "success") {
            addAlert("error", json.message)
            return Promise.reject(json.message)
        }

        secretKey = json.secret_key
        deviceId = json.device_id
        const provisioningUri = json.provisioning_uri

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

        const buttons = [
            {
                text: gettext("Verify"),
                classes: "fw-dark",
                click: () => {
                    const codeInput = document.querySelector("#two-factor-code")
                    const code = codeInput.value.trim()

                    if (code.length !== 6) {
                        addAlert(
                            "error",
                            gettext("Please enter a 6-digit code.")
                        )
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
                            addAlert(
                                "error",
                                gettext("Could not verify the code.")
                            )
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
            body: `
                    <p>${gettext("Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)")}</p>
                    <div class="two-factor-qr-wrapper"></div>
                    <p><strong>${gettext("Or enter this code manually:")}</strong></p>
                    <code class="two-factor-secret">${secretKey}</code>
                    <div class="two-factor-verify-section">
                        <p>${gettext("Enter the 6-digit code from your authenticator app to verify:")}</p>
                        <input type="text" id="two-factor-code" placeholder="123456" maxlength="6" class="fw-button fw-large" autocomplete="one-time-code" />
                    </div>
                `,
            buttons,
            icon: "shield-alt",
            width: 500
        })

        dialog.open()

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
}

export const twoFactorDisableDialog = () => {
    const buttons = [
        {
            text: gettext("Disable 2FA"),
            classes: "fw-orange",
            click: () => {
                const passwordInput = document.getElementById(
                    "two-factor-disable-password"
                )
                const codeInput = document.getElementById(
                    "two-factor-disable-code"
                )
                const password = passwordInput ? passwordInput.value : ""
                const code = codeInput ? codeInput.value.trim() : ""

                if (password.length === 0) {
                    addAlert("error", gettext("Please enter your password."))
                    return
                }

                if (code.length !== 6) {
                    addAlert("error", gettext("Please enter a 6-digit code."))
                    return
                }

                activateWait()
                postJson("/api/user/two-factor/disable/", {password, code})
                    .then(({json}) => {
                        if (json.status === "success") {
                            addAlert("success", json.message)
                            dialog.close()
                            window.location.reload()
                        } else {
                            addAlert("error", json.message)
                        }
                    })
                    .catch(errorResponse => {
                        // The server rejects missing/invalid re-authentication
                        // with a 4xx carrying a JSON message.
                        if (errorResponse && errorResponse.json) {
                            errorResponse
                                .json()
                                .then(json => {
                                    addAlert(
                                        "error",
                                        json.message ||
                                            gettext(
                                                "Could not disable two-factor authentication."
                                            )
                                    )
                                })
                                .catch(() => {
                                    addAlert(
                                        "error",
                                        gettext(
                                            "Could not disable two-factor authentication."
                                        )
                                    )
                                })
                        } else {
                            addAlert(
                                "error",
                                gettext(
                                    "Could not disable two-factor authentication."
                                )
                            )
                        }
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
        body: `<p>${gettext("Are you sure you want to disable two-factor authentication? This will reduce the security of your account.")}</p>
            <p>${gettext("Confirm with your account password and a code from your authenticator app:")}</p>
            <div class="two-factor-verify-section">
                <label for="two-factor-disable-password">${gettext("Password")}</label>
                <input type="password" id="two-factor-disable-password" class="fw-button fw-large" autocomplete="current-password" data-1p-ignore data-lpignore="true" data-form-type="other" />
            </div>
            <div class="two-factor-verify-section">
                <label for="two-factor-disable-code">${gettext("Authenticator code")}</label>
                <input type="text" id="two-factor-disable-code" placeholder="123456" maxlength="6" class="fw-button fw-large" autocomplete="one-time-code" />
            </div>`,
        buttons,
        icon: "exclamation-triangle"
    })

    dialog.open()

    const disableCodeInput = dialog.dialogEl.querySelector(
        "#two-factor-disable-code"
    )
    if (disableCodeInput) {
        disableCodeInput.addEventListener("keypress", event => {
            if (event.key === "Enter") {
                event.preventDefault()
                buttons[0].click()
            }
        })
    }

    return dialog
}

export const twoFactorLoginDialog = ({
    login,
    password,
    remember,
    loginPage
}) => {
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
        codeInput.addEventListener("keypress", event => {
            if (event.key === "Enter") {
                event.preventDefault()
                buttons[0].click()
            }
        })
    }
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
