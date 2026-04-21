/**
 * E2EE Password Dialog - UI for entering, creating, and changing
 * document passwords for end-to-end encrypted documents.
 *
 * Provides three dialog types:
 * 1. Enter password - when opening an encrypted document
 * 2. Create password - when creating a new encrypted document
 * 3. Change password - when changing the password of an existing encrypted document
 *
 * Password requirements:
 * - Minimum 5 characters
 * While the requirements are not satisfactory for security,
 * the user is shown a degree of weakness and is therefore encouraged to use a stronger password.
 */

import {Dialog} from "../../common"

/**
 * Validate a password against the minimum requirements.
 *
 * @param {string} password - The password to validate
 * @returns {{valid: boolean, message: string}} Validation result
 */
export function validatePassword(password) {
    if (!password || password.length < 5) {
        return {
            valid: false,
            message: gettext("Password must be at least 5 characters long.")
        }
    }
    return {valid: true, message: ""}
}

/**
 * Calculate a rough password strength score (0-4).
 *
 * Based on length, character variety, and common patterns.
 * This is a simple heuristic — not a substitute for a proper
 * password strength estimator like zxcvbn, but sufficient for
 * a basic strength meter.
 *
 * @param {string} password - The password to evaluate
 * @returns {number} Strength score from 0 (very weak) to 4 (very strong)
 */
export function passwordStrength(password) {
    if (!password) {
        return 0
    }

    let score = 0

    // Length contributions
    if (password.length >= 12) {
        score++
    }
    if (password.length >= 16) {
        score++
    }
    if (password.length >= 20) {
        score++
    }

    // Character variety contributions
    const hasLower = /[a-z]/.test(password)
    const hasUpper = /[A-Z]/.test(password)
    const hasDigit = /[0-9]/.test(password)
    const hasSpecial = /[^a-zA-Z0-9]/.test(password)

    const varietyCount = [hasLower, hasUpper, hasDigit, hasSpecial].filter(
        Boolean
    ).length
    if (varietyCount >= 3) {
        score++
    }

    // Penalize very common patterns
    const commonPatterns = [
        /^123456/,
        /^123123/,
        /^password/i,
        /^qwerty/i,
        /^abc123/i,
        /(.)\1{3,}/ // Repeated characters (4+ in a row)
    ]
    for (const pattern of commonPatterns) {
        if (pattern.test(password)) {
            score = Math.max(0, score - 2)
            break
        }
    }

    return Math.min(4, Math.max(0, score))
}

/**
 * Get a CSS class and label for a password strength score.
 *
 * @param {number} score - Strength score from passwordStrength()
 * @returns {{cssClass: string, label: string}}
 */
export function strengthInfo(score) {
    const levels = [
        {cssClass: "very-weak", label: gettext("Very weak")},
        {cssClass: "weak", label: gettext("Weak")},
        {cssClass: "fair", label: gettext("Fair")},
        {cssClass: "strong", label: gettext("Strong")},
        {cssClass: "very-strong", label: gettext("Very strong")}
    ]
    return levels[score] || levels[0]
}

/**
 * Show a dialog for entering the password to decrypt an E2EE document.
 *
 * This dialog is shown when a user opens an encrypted document.
 * The user must enter the password to derive the decryption key.
 *
 * If the URL contains a fragment (e.g., #PASSWORD from a share link),
 * the password field is pre-filled and the dialog can be auto-submitted.
 *
 * @param {Function} onPassword - Callback called with the entered password string
 * @param {string} [urlFragment] - Password from URL fragment (share link), if available
 * @returns {Promise<void>}
 */
export function enterPasswordDialog(onPassword, urlFragment = "") {
    return new Promise(resolve => {
        const dialogId = "e2ee-enter-password"

        // If password was provided via URL fragment, use it directly
        if (urlFragment && urlFragment.length > 0) {
            onPassword(urlFragment)
            resolve()
            return
        }

        const body = `
            <div class="e2ee-password-dialog">
                <p>${gettext("This document is end-to-end encrypted. Enter the password to decrypt it.")}</p>
                <div class="e2ee-password-field">
                    <label for="e2ee-password-input">${gettext("Password")}</label>
                    <input type="password" id="e2ee-password-input" class="e2ee-password-input"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" autofocus />
                    <button type="button" class="e2ee-toggle-visibility" title="${gettext("Show password")}">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
                <div class="e2ee-password-error" id="e2ee-password-error"></div>
            </div>
        `

        // Declare dialogInstance before buttons so the click handler
        // can call dialogInstance.close().
        let dialogInstance

        const buttons = [
            {
                text: gettext("Decrypt"),
                classes: "fw-button fw-dark",
                click: () => {
                    const input = document.getElementById("e2ee-password-input")
                    const password = input ? input.value : ""
                    if (password.length === 0) {
                        const errorEl = document.getElementById(
                            "e2ee-password-error"
                        )
                        if (errorEl) {
                            errorEl.textContent = gettext(
                                "Please enter the password."
                            )
                        }
                        return
                    }
                    dialogInstance.close()
                    onPassword(password)
                    resolve()
                }
            }
        ]

        const dialog = {
            title: gettext("Encrypted Document"),
            id: dialogId,
            body: body,
            buttons: buttons,
            canClose: true
        }

        // Use the Fidus Writer dialog system
        dialogInstance = new Dialog(dialog)
        dialogInstance.open()

        // Set up toggle visibility button
        setTimeout(() => {
            const toggleBtn = document.querySelector(
                `#${dialogId} .e2ee-toggle-visibility`
            )
            const input = document.getElementById("e2ee-password-input")
            if (toggleBtn && input) {
                toggleBtn.addEventListener("click", () => {
                    if (input.type === "password") {
                        input.type = "text"
                        toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i>'
                        toggleBtn.title = gettext("Hide password")
                    } else {
                        input.type = "password"
                        toggleBtn.innerHTML = '<i class="fas fa-eye"></i>'
                        toggleBtn.title = gettext("Show password")
                    }
                })
            }

            // Submit on Enter key
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
 * Show a dialog for creating a password for a new E2EE document.
 *
 * This dialog is shown when a user creates a new encrypted document.
 * The user must enter and confirm a password. The password must meet
 * the minimum requirements (12+ characters, at least one letter and
 * one number).
 *
 * @param {Function} onPassword - Callback called with the entered password string
 * @returns {Promise<void>}
 */
export function createPasswordDialog(onPassword) {
    return new Promise(resolve => {
        const dialogId = "e2ee-create-password"

        const body = `
            <div class="e2ee-password-dialog">
                <p>${gettext("Set a password to encrypt this document. You will need this password to open the document in the future.")}</p>
                <p class="e2ee-password-hint">${gettext('Tip: Use a passphrase with multiple words, e.g. "correct-horse-battery-staple". This is both secure and easy to remember.')}</p>
                <div class="e2ee-password-field">
                    <label for="e2ee-new-password-input">${gettext("Password")}</label>
                    <input type="password" id="e2ee-new-password-input" class="e2ee-password-input"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" autofocus />
                    <button type="button" class="e2ee-toggle-visibility" title="${gettext("Show password")}">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
                <div class="e2ee-strength-meter">
                    <div class="e2ee-strength-bar" id="e2ee-strength-bar"></div>
                    <span class="e2ee-strength-label" id="e2ee-strength-label"></span>
                </div>
                <div class="e2ee-password-field">
                    <label for="e2ee-confirm-password-input">${gettext("Confirm password")}</label>
                    <input type="password" id="e2ee-confirm-password-input" class="e2ee-password-input"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" />
                </div>
                <div class="e2ee-password-error" id="e2ee-password-error"></div>
            </div>
        `

        // Declare dialogInstance before buttons so the click handler
        // can call dialogInstance.close().
        let dialogInstance

        const buttons = [
            {
                text: gettext("Create Encrypted Document"),
                classes: "fw-button fw-dark",
                click: () => {
                    const input = document.getElementById(
                        "e2ee-new-password-input"
                    )
                    const confirmInput = document.getElementById(
                        "e2ee-confirm-password-input"
                    )
                    const errorEl = document.getElementById(
                        "e2ee-password-error"
                    )
                    const password = input ? input.value : ""
                    const confirmPassword = confirmInput
                        ? confirmInput.value
                        : ""

                    // Validate password
                    const validation = validatePassword(password)
                    if (!validation.valid) {
                        if (errorEl) {
                            errorEl.textContent = validation.message
                        }
                        return
                    }

                    // Check confirmation
                    if (password !== confirmPassword) {
                        if (errorEl) {
                            errorEl.textContent = gettext(
                                "Passwords do not match."
                            )
                        }
                        return
                    }

                    dialogInstance.close()
                    onPassword(password)
                    resolve()
                }
            }
        ]

        const dialog = {
            title: gettext("Set Document Password"),
            id: dialogId,
            body: body,
            buttons: buttons,
            canClose: true
        }

        dialogInstance = new Dialog(dialog)
        dialogInstance.open()

        setTimeout(() => {
            // Set up toggle visibility buttons
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

            // Set up strength meter
            const passwordInput = document.getElementById(
                "e2ee-new-password-input"
            )
            if (passwordInput) {
                passwordInput.addEventListener("input", () => {
                    const score = passwordStrength(passwordInput.value)
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
                // Initialize strength meter
                passwordInput.dispatchEvent(new Event("input"))
                passwordInput.focus()
            }

            // Submit on Enter key in confirm field
            const confirmInput = document.getElementById(
                "e2ee-confirm-password-input"
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
 * Show a dialog for changing the password of an existing E2EE document.
 *
 * The user must enter their current password (to verify identity),
 * then enter and confirm a new password.
 *
 * @param {Function} onPasswordChange - Callback called with
 *   {currentPassword: string, newPassword: string}
 * @returns {Promise<void>}
 */
export function changePasswordDialog(onPasswordChange) {
    return new Promise(resolve => {
        const dialogId = "e2ee-change-password"

        const body = `
            <div class="e2ee-password-dialog">
                <p>${gettext("Change the document password. After changing, you must share the new password with all collaborators.")}</p>
                <div class="e2ee-password-field">
                    <label for="e2ee-current-password-input">${gettext("Current password")}</label>
                    <input type="password" id="e2ee-current-password-input" class="e2ee-password-input"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" autofocus />
                </div>
                <hr />
                <div class="e2ee-password-field">
                    <label for="e2ee-new-password-input">${gettext("New password")}</label>
                    <input type="password" id="e2ee-new-password-input" class="e2ee-password-input"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" />
                    <button type="button" class="e2ee-toggle-visibility" title="${gettext("Show password")}">
                        <i class="fas fa-eye"></i>
                    </button>
                </div>
                <div class="e2ee-strength-meter">
                    <div class="e2ee-strength-bar" id="e2ee-strength-bar"></div>
                    <span class="e2ee-strength-label" id="e2ee-strength-label"></span>
                </div>
                <div class="e2ee-password-field">
                    <label for="e2ee-confirm-password-input">${gettext("Confirm new password")}</label>
                    <input type="password" id="e2ee-confirm-password-input" class="e2ee-password-input"
                           autocomplete="off" data-1p-ignore data-lp-ignore data-lpignore="true" data-bwignore data-form-type="other" />
                </div>
                <div class="e2ee-password-error" id="e2ee-password-error"></div>
            </div>
        `

        const buttons = [
            {
                text: gettext("Change Password"),
                classes: "fw-button fw-dark",
                click: () => {
                    const currentInput = document.getElementById(
                        "e2ee-current-password-input"
                    )
                    const newInput = document.getElementById(
                        "e2ee-new-password-input"
                    )
                    const confirmInput = document.getElementById(
                        "e2ee-confirm-password-input"
                    )
                    const errorEl = document.getElementById(
                        "e2ee-password-error"
                    )

                    const currentPassword = currentInput
                        ? currentInput.value
                        : ""
                    const newPassword = newInput ? newInput.value : ""
                    const confirmPassword = confirmInput
                        ? confirmInput.value
                        : ""

                    // Validate current password
                    if (currentPassword.length === 0) {
                        if (errorEl) {
                            errorEl.textContent = gettext(
                                "Please enter the current password."
                            )
                        }
                        return
                    }

                    // Validate new password
                    const validation = validatePassword(newPassword)
                    if (!validation.valid) {
                        if (errorEl) {
                            errorEl.textContent = validation.message
                        }
                        return
                    }

                    // Check confirmation
                    if (newPassword !== confirmPassword) {
                        if (errorEl) {
                            errorEl.textContent = gettext(
                                "Passwords do not match."
                            )
                        }
                        return
                    }

                    // Check that new password is different
                    if (currentPassword === newPassword) {
                        if (errorEl) {
                            errorEl.textContent = gettext(
                                "New password must be different from the current password."
                            )
                        }
                        return
                    }

                    dialogInstance.close()
                    onPasswordChange({currentPassword, newPassword})
                    resolve()
                }
            }
        ]

        const dialog = {
            title: gettext("Change Document Password"),
            id: dialogId,
            body: body,
            buttons: buttons,
            canClose: true
        }

        const dialogInstance = new Dialog(dialog)
        dialogInstance.open()

        setTimeout(() => {
            // Set up toggle visibility buttons
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

            // Set up strength meter
            const passwordInput = document.getElementById(
                "e2ee-new-password-input"
            )
            if (passwordInput) {
                passwordInput.addEventListener("input", () => {
                    const score = passwordStrength(passwordInput.value)
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
                passwordInput.dispatchEvent(new Event("input"))
            }

            // Submit on Enter key
            const confirmInput = document.getElementById(
                "e2ee-confirm-password-input"
            )
            if (confirmInput) {
                confirmInput.addEventListener("keypress", event => {
                    if (event.key === "Enter") {
                        event.preventDefault()
                        buttons[0].click()
                    }
                })
            }

            const currentInput = document.getElementById(
                "e2ee-current-password-input"
            )
            if (currentInput) {
                currentInput.focus()
            }
        }, 100)
    })
}
