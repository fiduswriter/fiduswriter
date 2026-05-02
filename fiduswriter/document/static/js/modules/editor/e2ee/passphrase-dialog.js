/**
 * Passphrase Dialog - UI for the Personal Passphrase system.
 *
 * Provides dialogs for:
 * 1. Setup passphrase - first-time key generation
 * 2. Enter passphrase - unlock keys from sessionStorage
 * 3. Display recovery key - show recovery key after setup
 * 4. Recover with key - use recovery key to reset passphrase
 */

import {Dialog, escapeText} from "../../common"
import {passwordStrength, strengthInfo} from "./password-dialog"

/**
 * Show a dialog to set up the personal passphrase for the first time.
 *
 * @param {Function} onSetup - Callback called with the passphrase string
 * @returns {Promise<void>}
 */
export function setupPassphraseDialog(onSetup) {
    return new Promise(resolve => {
        const dialogId = "e2ee-setup-passphrase"

        const body = `
            <div class="e2ee-password-dialog">
                <p>${gettext("Set up a personal encryption passphrase. This passphrase will unlock all your encrypted documents — you will not need separate passwords for each document.")}</p>
                <p class="e2ee-password-hint"><strong>${gettext("Important:")}</strong> ${gettext("This passphrase is separate from your login password. If you lose it, your encrypted documents cannot be recovered.")}</p>
                <div class="e2ee-password-field">
                    <label for="e2ee-passphrase-input">${gettext("Passphrase")}</label>
                    <input type="password" id="e2ee-passphrase-input" class="e2ee-password-input"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" autofocus />
                    <button type="button" class="e2ee-toggle-visibility" title="${gettext("Show passphrase")}">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
                <div class="e2ee-strength-meter">
                    <div class="e2ee-strength-bar" id="e2ee-strength-bar"></div>
                    <span class="e2ee-strength-label" id="e2ee-strength-label"></span>
                </div>
                <div class="e2ee-password-field">
                    <label for="e2ee-confirm-passphrase-input">${gettext("Confirm passphrase")}</label>
                    <input type="password" id="e2ee-confirm-passphrase-input" class="e2ee-password-input"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" />
                </div>
                <div class="e2ee-password-error" id="e2ee-passphrase-error"></div>
            </div>
        `

        const buttons = [
            {
                text: gettext("Set Up Encryption"),
                classes: "fw-button fw-dark",
                click: () => {
                    const input = document.getElementById(
                        "e2ee-passphrase-input"
                    )
                    const confirmInput = document.getElementById(
                        "e2ee-confirm-passphrase-input"
                    )
                    const errorEl = document.getElementById(
                        "e2ee-passphrase-error"
                    )
                    const passphrase = input ? input.value : ""
                    const confirmPassphrase = confirmInput
                        ? confirmInput.value
                        : ""

                    if (passphrase.length < 8) {
                        if (errorEl) {
                            errorEl.textContent = gettext(
                                "Passphrase must be at least 8 characters long."
                            )
                        }
                        return
                    }

                    if (passphrase !== confirmPassphrase) {
                        if (errorEl) {
                            errorEl.textContent = gettext(
                                "Passphrases do not match."
                            )
                        }
                        return
                    }

                    dialogInstance.close()
                    onSetup(passphrase)
                    resolve()
                }
            }
        ]

        const dialog = {
            title: gettext("Set Up Personal Encryption"),
            id: dialogId,
            body: body,
            buttons: buttons,
            canClose: true
        }

        const dialogInstance = new Dialog(dialog)
        dialogInstance.open()

        setTimeout(() => {
            const toggleBtns = document.querySelectorAll(
                `#${dialogId} .e2ee-toggle-visibility`
            )
            toggleBtns.forEach(btn => {
                btn.addEventListener("click", () => {
                    const input = btn.parentElement.querySelector("input")
                    if (input) {
                        if (input.type === "password") {
                            input.type = "text"
                            btn.innerHTML = '<i class="fas fa-eye-slash"></i>'
                        } else {
                            input.type = "password"
                            btn.innerHTML = '<i class="fas fa-eye"></i>'
                        }
                    }
                })
            })

            const passphraseInput = document.getElementById(
                "e2ee-passphrase-input"
            )
            if (passphraseInput) {
                passphraseInput.addEventListener("input", () => {
                    const score = passwordStrength(passphraseInput.value)
                    const info = strengthInfo(score)
                    const bar = document.getElementById("e2ee-strength-bar")
                    const label = document.getElementById("e2ee-strength-label")
                    if (bar) {
                        bar.className = `e2ee-strength-bar ${info.cssClass}`
                        bar.style.width = `${(score + 1) * 25}%`
                    }
                    if (label) {
                        label.textContent = info.label
                        label.className = `e2ee-strength-label ${info.cssClass}`
                    }
                })
                passphraseInput.dispatchEvent(new Event("input"))
                passphraseInput.focus()
            }

            const confirmInput = document.getElementById(
                "e2ee-confirm-passphrase-input"
            )
            if (confirmInput) {
                confirmInput.addEventListener("keypress", event => {
                    if (event.key === "Enter") {
                        event.preventDefault()
                        buttons[0].click()
                    }
                })
            }
        }, 100)
    })
}

/**
 * Show a dialog to enter the personal passphrase to unlock encryption keys.
 *
 * @param {Function} onUnlock - Callback called with the passphrase string
 * @param {Function} onRecover - Callback when user clicks "Recover with key"
 * @param {Object} [options] - Optional settings
 * @param {string} [options.errorMessage] - Inline error to display
 * @returns {Promise<void>}
 */
export function enterPassphraseDialog(
    onUnlock,
    onRecover = null,
    options = {}
) {
    return new Promise(resolve => {
        const dialogId = "e2ee-enter-passphrase"
        const errorMessage = options.errorMessage || ""

        const body = `
            <div class="e2ee-password-dialog">
                <p>${gettext("Enter your personal encryption passphrase to unlock your documents.")}</p>
                <div class="e2ee-password-field">
                    <label for="e2ee-passphrase-input">${gettext("Passphrase")}</label>
                    <input type="password" id="e2ee-passphrase-input" class="e2ee-password-input"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" autofocus />
                    <button type="button" class="e2ee-toggle-visibility" title="${gettext("Show passphrase")}">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
                <div class="e2ee-password-error" id="e2ee-passphrase-error">${escapeText(errorMessage)}</div>
            </div>
        `

        const buttons = [
            {
                text: gettext("Unlock"),
                classes: "fw-button fw-dark",
                click: () => {
                    const input = document.getElementById(
                        "e2ee-passphrase-input"
                    )
                    const passphrase = input ? input.value : ""
                    if (passphrase.length === 0) {
                        const errorEl = document.getElementById(
                            "e2ee-passphrase-error"
                        )
                        if (errorEl) {
                            errorEl.textContent = gettext(
                                "Please enter your passphrase."
                            )
                        }
                        return
                    }
                    dialogInstance.close()
                    onUnlock(passphrase)
                    resolve()
                }
            },
            {
                text: gettext("Cancel"),
                classes: "fw-button fw-light",
                click: () => {
                    dialogInstance.close()
                    resolve()
                }
            }
        ]

        if (onRecover) {
            buttons.push({
                text: gettext("Recover with key"),
                classes: "fw-button fw-orange",
                click: () => {
                    dialogInstance.close()
                    onRecover()
                    resolve()
                }
            })
        }

        const dialog = {
            title: gettext("Unlock Encryption"),
            id: dialogId,
            body: body,
            buttons: buttons,
            canClose: true
        }

        const dialogInstance = new Dialog(dialog)
        dialogInstance.open()

        setTimeout(() => {
            const toggleBtn = document.querySelector(
                `#${dialogId} .e2ee-toggle-visibility`
            )
            const input = document.getElementById("e2ee-passphrase-input")
            if (toggleBtn && input) {
                toggleBtn.addEventListener("click", () => {
                    if (input.type === "password") {
                        input.type = "text"
                        toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i>'
                        toggleBtn.title = gettext("Hide passphrase")
                    } else {
                        input.type = "password"
                        toggleBtn.innerHTML = '<i class="fas fa-eye"></i>'
                        toggleBtn.title = gettext("Show passphrase")
                    }
                })
            }

            if (input) {
                input.addEventListener("keypress", event => {
                    if (event.key === "Enter") {
                        event.preventDefault()
                        buttons[0].click()
                    }
                })
                input.focus()
            }
        }, 100)
    })
}

/**
 * Show a dialog displaying the recovery key to the user.
 *
 * @param {string} recoveryKey - The recovery key to display
 * @param {Function} onContinue - Callback when user clicks Continue
 * @returns {Promise<void>}
 */
export function showRecoveryKeyDialog(recoveryKey, onContinue) {
    return new Promise(resolve => {
        const dialogId = "e2ee-recovery-key"

        const body = `
            <div class="e2ee-password-dialog">
                <p><strong>${gettext("This is your recovery key.")}</strong></p>
                <p>${gettext("Store it somewhere safe (e.g., a password manager, printed copy). If you forget your passphrase, this is the ONLY way to recover your encrypted documents. We cannot recover it for you.")}</p>
                <div class="e2ee-recovery-key-box">
                    <code id="e2ee-recovery-key-value">${recoveryKey}</code>
                    <button type="button" class="fw-button fw-light" id="e2ee-copy-recovery-key">
                        <i class="fas fa-copy"></i> ${gettext("Copy")}
                    </button>
                </div>
                <p class="e2ee-password-hint"><strong>${gettext("Copy it now — it will not be shown again.")}</strong></p>
            </div>
        `

        const buttons = [
            {
                text: gettext("I have saved it"),
                classes: "fw-button fw-dark",
                click: () => {
                    dialogInstance.close()
                    if (typeof onContinue === "function") {
                        onContinue()
                    }
                    resolve()
                }
            }
        ]

        const dialog = {
            title: gettext("Recovery Key"),
            id: dialogId,
            body: body,
            buttons: buttons,
            canClose: false
        }

        const dialogInstance = new Dialog(dialog)
        dialogInstance.open()

        setTimeout(() => {
            const copyBtn = document.getElementById("e2ee-copy-recovery-key")
            if (copyBtn) {
                copyBtn.addEventListener("click", () => {
                    navigator.clipboard.writeText(recoveryKey).then(() => {
                        copyBtn.innerHTML = `<i class="fas fa-check"></i> ${gettext("Copied!")}`
                        setTimeout(() => {
                            copyBtn.innerHTML = `<i class="fas fa-copy"></i> ${gettext("Copy")}`
                        }, 2000)
                    })
                })
            }
        }, 100)
    })
}

/**
 * Show a dialog to recover encryption keys using the recovery key.
 *
 * @param {Function} onRecover - Callback called with {recoveryKey: string, newPassphrase: string}
 * @returns {Promise<void>}
 */
export function recoverWithKeyDialog(onRecover) {
    return new Promise(resolve => {
        const dialogId = "e2ee-recover-with-key"

        const body = `
            <div class="e2ee-password-dialog">
                <p>${gettext("Enter your recovery key and a new passphrase to regain access to your encrypted documents.")}</p>
                <div class="e2ee-password-field">
                    <label for="e2ee-recovery-key-input">${gettext("Recovery key")}</label>
                    <input type="text" id="e2ee-recovery-key-input" class="e2ee-password-input"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" autofocus />
                </div>
                <div class="e2ee-password-field">
                    <label for="e2ee-new-passphrase-input">${gettext("New passphrase")}</label>
                    <input type="password" id="e2ee-new-passphrase-input" class="e2ee-password-input"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" />
                    <button type="button" class="e2ee-toggle-visibility" title="${gettext("Show passphrase")}">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
                <div class="e2ee-password-field">
                    <label for="e2ee-confirm-passphrase-input">${gettext("Confirm new passphrase")}</label>
                    <input type="password" id="e2ee-confirm-passphrase-input" class="e2ee-password-input"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" />
                </div>
                <div class="e2ee-password-error" id="e2ee-recover-error"></div>
            </div>
        `

        const buttons = [
            {
                text: gettext("Recover"),
                classes: "fw-button fw-dark",
                click: () => {
                    const recoveryInput = document.getElementById(
                        "e2ee-recovery-key-input"
                    )
                    const newInput = document.getElementById(
                        "e2ee-new-passphrase-input"
                    )
                    const confirmInput = document.getElementById(
                        "e2ee-confirm-passphrase-input"
                    )
                    const errorEl =
                        document.getElementById("e2ee-recover-error")

                    const recoveryKey = recoveryInput
                        ? recoveryInput.value.trim()
                        : ""
                    const newPassphrase = newInput ? newInput.value : ""
                    const confirmPassphrase = confirmInput
                        ? confirmInput.value
                        : ""

                    if (recoveryKey.length === 0) {
                        if (errorEl) {
                            errorEl.textContent = gettext(
                                "Please enter your recovery key."
                            )
                        }
                        return
                    }

                    if (newPassphrase.length < 8) {
                        if (errorEl) {
                            errorEl.textContent = gettext(
                                "Passphrase must be at least 8 characters long."
                            )
                        }
                        return
                    }

                    if (newPassphrase !== confirmPassphrase) {
                        if (errorEl) {
                            errorEl.textContent = gettext(
                                "Passphrases do not match."
                            )
                        }
                        return
                    }

                    dialogInstance.close()
                    onRecover({recoveryKey, newPassphrase})
                    resolve()
                }
            },
            {
                text: gettext("Cancel"),
                classes: "fw-button fw-light",
                click: () => {
                    dialogInstance.close()
                    resolve()
                }
            }
        ]

        const dialog = {
            title: gettext("Recover Encryption"),
            id: dialogId,
            body: body,
            buttons: buttons,
            canClose: true
        }

        const dialogInstance = new Dialog(dialog)
        dialogInstance.open()

        setTimeout(() => {
            const toggleBtns = document.querySelectorAll(
                `#${dialogId} .e2ee-toggle-visibility`
            )
            toggleBtns.forEach(btn => {
                btn.addEventListener("click", () => {
                    const input = btn.parentElement.querySelector("input")
                    if (input) {
                        if (input.type === "password") {
                            input.type = "text"
                            btn.innerHTML = '<i class="fas fa-eye-slash"></i>'
                        } else {
                            input.type = "password"
                            btn.innerHTML = '<i class="fas fa-eye"></i>'
                        }
                    }
                })
            })

            const confirmInput = document.getElementById(
                "e2ee-confirm-passphrase-input"
            )
            if (confirmInput) {
                confirmInput.addEventListener("keypress", event => {
                    if (event.key === "Enter") {
                        event.preventDefault()
                        buttons[0].click()
                    }
                })
            }
        }, 100)
    })
}

/**
 * Show a dialog to change the encryption passphrase.
 *
 * @param {Function} onChange - Callback called with {oldPassphrase: string, newPassphrase: string}
 * @returns {Promise<void>}
 */
export function changePassphraseDialog(onChange) {
    return new Promise(resolve => {
        const dialogId = "e2ee-change-passphrase"

        const body = `
            <div class="e2ee-password-dialog">
                <p>${gettext("Enter your current passphrase and a new passphrase to change your encryption password.")}</p>
                <div class="e2ee-password-field">
                    <label for="e2ee-old-passphrase-input">${gettext("Current passphrase")}</label>
                    <input type="password" id="e2ee-old-passphrase-input" class="e2ee-password-input"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" autofocus />
                    <button type="button" class="e2ee-toggle-visibility" title="${gettext("Show passphrase")}">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
                <div class="e2ee-password-field">
                    <label for="e2ee-new-passphrase-input">${gettext("New passphrase")}</label>
                    <input type="password" id="e2ee-new-passphrase-input" class="e2ee-password-input"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" />
                    <button type="button" class="e2ee-toggle-visibility" title="${gettext("Show passphrase")}">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
                <div class="e2ee-password-field">
                    <label for="e2ee-confirm-new-passphrase-input">${gettext("Confirm new passphrase")}</label>
                    <input type="password" id="e2ee-confirm-new-passphrase-input" class="e2ee-password-input"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" />
                </div>
                <div class="e2ee-password-error" id="e2ee-change-error"></div>
            </div>
        `

        const buttons = [
            {
                text: gettext("Change Passphrase"),
                classes: "fw-button fw-dark",
                click: () => {
                    const oldInput = document.getElementById(
                        "e2ee-old-passphrase-input"
                    )
                    const newInput = document.getElementById(
                        "e2ee-new-passphrase-input"
                    )
                    const confirmInput = document.getElementById(
                        "e2ee-confirm-new-passphrase-input"
                    )
                    const errorEl = document.getElementById("e2ee-change-error")

                    const oldPassphrase = oldInput ? oldInput.value : ""
                    const newPassphrase = newInput ? newInput.value : ""
                    const confirmPassphrase = confirmInput
                        ? confirmInput.value
                        : ""

                    if (oldPassphrase.length === 0) {
                        if (errorEl) {
                            errorEl.textContent = gettext(
                                "Please enter your current passphrase."
                            )
                        }
                        return
                    }

                    if (newPassphrase.length < 8) {
                        if (errorEl) {
                            errorEl.textContent = gettext(
                                "Passphrase must be at least 8 characters long."
                            )
                        }
                        return
                    }

                    if (newPassphrase !== confirmPassphrase) {
                        if (errorEl) {
                            errorEl.textContent = gettext(
                                "Passphrases do not match."
                            )
                        }
                        return
                    }

                    dialogInstance.close()
                    onChange({oldPassphrase, newPassphrase})
                    resolve()
                }
            },
            {
                text: gettext("Cancel"),
                classes: "fw-button fw-light",
                click: () => {
                    dialogInstance.close()
                    resolve()
                }
            }
        ]

        const dialog = {
            title: gettext("Change Encryption Passphrase"),
            id: dialogId,
            body: body,
            buttons: buttons,
            canClose: true
        }

        const dialogInstance = new Dialog(dialog)
        dialogInstance.open()

        setTimeout(() => {
            const toggleBtns = document.querySelectorAll(
                `#${dialogId} .e2ee-toggle-visibility`
            )
            toggleBtns.forEach(btn => {
                btn.addEventListener("click", () => {
                    const input = btn.parentElement.querySelector("input")
                    if (input) {
                        if (input.type === "password") {
                            input.type = "text"
                            btn.innerHTML = '<i class="fas fa-eye-slash"></i>'
                        } else {
                            input.type = "password"
                            btn.innerHTML = '<i class="fas fa-eye"></i>'
                        }
                    }
                })
            })

            const confirmInput = document.getElementById(
                "e2ee-confirm-new-passphrase-input"
            )
            if (confirmInput) {
                confirmInput.addEventListener("keypress", event => {
                    if (event.key === "Enter") {
                        event.preventDefault()
                        buttons[0].click()
                    }
                })
            }
        }, 100)
    })
}
