import {
    ContentMenu,
    Dialog,
    addAlert,
    enableDatePicker,
    findTarget,
    jsonPost,
    jsonPostJson,
    setCheckableLabel
} from "../../common"
import {AddContactDialog} from "../../contacts/add_dialog"
import {
    accessRightOverviewTemplate,
    collaboratorsTemplate,
    contactsTemplate,
    createShareTokenDialogTemplate,
    shareTokenListTemplate,
    shareTokenRowTemplate
} from "./templates"

/**
 * Functions for the document access rights dialog.
 */

export class DocumentAccessRightsDialog {
    constructor(
        documentIds,
        contacts,
        newContactCall,
        e2ee = false,
        documentPassword = "",
        onShareSuccess = null
    ) {
        this.documentIds = documentIds
        this.contacts = contacts
        this.newContactCall = newContactCall // a function to be called when a new contact has been added with contact details
        // Share-link tab is only available when a single document is selected
        this.singleDocumentId = documentIds.length === 1 ? documentIds[0] : null
        // Whether the document(s) are E2EE encrypted. For E2EE documents,
        // only a subset of access rights are available.
        this.e2ee = e2ee
        // The document password, if known (e.g. when opened in the editor).
        // Used to pre-fill the share-link password field.
        this.documentPassword = documentPassword
        // Optional callback invoked after access rights are saved successfully.
        // Receives the array of new access rights.
        this.onShareSuccess = onShareSuccess
    }

    init() {
        jsonPostJson("/api/document/get_access_rights/", {
            document_ids: this.documentIds
        })
            .catch(error => {
                addAlert("error", gettext("Cannot load document access data."))
                throw error
            })
            .then(({json}) => {
                this.accessRights = json.access_rights
                this.createAccessRightsDialog()
            })
    }

    getDropdownMenu(currentRight, onChange) {
        // E2EE documents only support a subset of access rights because
        // the server cannot process encrypted content for features like
        // tracked changes, review filtering, etc.
        const E2EE_ALLOWED_RIGHTS = ["write", "read-without-comments", "read"]

        const allItems = [
            {
                type: "header",
                title: gettext("Basic"),
                tooltip: gettext("Basic access rights")
            },
            {
                type: "action",
                title: gettext("Write"),
                icon: "pencil-alt",
                tooltip: gettext("Write"),
                right: "write",
                action: () => {
                    onChange("write")
                },
                selected: currentRight === "write"
            },
            {
                type: "action",
                title: gettext("Write tracked"),
                icon: "pencil-alt",
                tooltip: gettext("Write with changes tracked"),
                right: "write-tracked",
                action: () => {
                    onChange("write-tracked")
                },
                selected: currentRight === "write-tracked"
            },
            {
                type: "action",
                title: gettext("Comment"),
                icon: "comment",
                tooltip: gettext("Comment"),
                right: "comment",
                action: () => {
                    onChange("comment")
                },
                selected: currentRight === "comment"
            },
            {
                type: "action",
                title: gettext("Read"),
                icon: "eye",
                tooltip: gettext("Read"),
                right: "read",
                action: () => {
                    onChange("read")
                },
                selected: currentRight === "read"
            },
            {
                type: "header",
                title: gettext("Review"),
                tooltip: gettext("Access rights used within document review")
            },
            {
                type: "action",
                title: gettext("No comments"),
                icon: "eye",
                tooltip: gettext(
                    "Read document but not see comments and chats of others"
                ),
                right: "read-without-comments",
                action: () => {
                    onChange("read-without-comments")
                },
                selected: currentRight === "read-without-comments"
            },
            {
                type: "action",
                title: gettext("Review"),
                icon: "comment",
                tooltip: gettext(
                    "Comment, but not see comments and chats of others"
                ),
                right: "review",
                action: () => {
                    onChange("review")
                },
                selected: currentRight === "review"
            },
            {
                type: "action",
                title: gettext("Review tracked"),
                icon: "pencil-alt",
                tooltip: gettext(
                    "Write with tracked changes, but not see comments and chats of others"
                ),
                right: "review-tracked",
                action: () => {
                    onChange("review-tracked")
                },
                selected: currentRight === "review-tracked"
            }
        ]

        // Filter items for E2EE documents
        const content = this.e2ee
            ? allItems.filter(item => {
                  // Keep headers
                  if (item.type === "header") {
                      return true
                  }
                  // Only keep allowed rights
                  return E2EE_ALLOWED_RIGHTS.includes(item.right)
              })
            : allItems

        // Remove trailing headers with no items after them
        const filteredContent = content.filter((item, index) => {
            if (item.type === "header") {
                // Check if there's at least one action item after this header
                // before the next header or end of list
                const nextItems = content.slice(index + 1)
                const nextAction = nextItems.find(i => i.type === "action")
                const nextHeader = nextItems.findIndex(i => i.type === "header")
                if (!nextAction) {
                    return false
                }
                if (
                    nextHeader >= 0 &&
                    nextHeader < nextItems.indexOf(nextAction)
                ) {
                    return false
                }
            }
            return true
        })

        return {content: filteredContent}
    }

    createAccessRightsDialog() {
        const docCollabs = {}

        // We are potentially dealing with access rights of several documents, so
        // we first need to find out which users have access on all of the documents.
        // Those are the access rights we will display in the dialog.
        this.accessRights.forEach(ar => {
            if (!this.documentIds.includes(ar.document_id)) {
                return
            }
            const holderIdent = ar.holder.type + ar.holder.id
            if (docCollabs[holderIdent]) {
                if (docCollabs[holderIdent].rights != ar.rights) {
                    // We use read rights if the user has different rights on different docs.
                    docCollabs[holderIdent].rights = "read"
                }
                docCollabs[holderIdent].count += 1
            } else {
                docCollabs[holderIdent] = Object.assign({}, ar)
                docCollabs[holderIdent].count = 1
            }
        })

        const collaborators = Object.values(docCollabs).filter(
            col => col.count === this.documentIds.length
        )

        // E2EE warning banner body (shown only for E2EE documents)
        const e2eeWarningBanner = this.e2ee
            ? `<div class="e2ee-access-rights-warning">
                <strong><i class="fas fa-lock"></i> ${gettext("End-to-end encrypted document")}</strong>
                <p>${gettext("This document is end-to-end encrypted. Collaborators without a personal passphrase will need the document password shared with them through a secure channel outside of Fidus Writer. Do not send the password through the document chat.")}</p>
            </div>`
            : ""

        const buttons = [
            {
                text:
                    settings_REGISTRATION_OPEN || settings_SOCIALACCOUNT_OPEN
                        ? gettext("Add contact or invite new user")
                        : gettext("Add contact"),
                classes: "fw-light fw-add-button",
                click: () => {
                    const dialog = new AddContactDialog()
                    dialog.init().then(contactsData => {
                        contactsData.forEach(contactData => {
                            if (contactData.id) {
                                document
                                    .querySelector(
                                        "#my-contacts .fw-data-table-body"
                                    )
                                    .insertAdjacentHTML(
                                        "beforeend",
                                        contactsTemplate({
                                            contacts: [contactData]
                                        })
                                    )
                                document
                                    .querySelector("#share-contact table tbody")
                                    .insertAdjacentHTML(
                                        "beforeend",
                                        collaboratorsTemplate({
                                            collaborators: [
                                                {
                                                    holder: contactData,
                                                    rights: "read"
                                                }
                                            ]
                                        })
                                    )
                                this.newContactCall(contactData)
                            } else {
                                document
                                    .querySelector("#share-contact table tbody")
                                    .insertAdjacentHTML(
                                        "beforeend",
                                        collaboratorsTemplate({
                                            collaborators: [
                                                {
                                                    holder: contactData,
                                                    rights: "read"
                                                }
                                            ]
                                        })
                                    )
                            }
                        })
                    })
                }
            },
            {
                text: gettext("Submit"),
                classes: "fw-dark",
                click: () => {
                    //apply the current state to server
                    const accessRights = []
                    document
                        .querySelectorAll("#share-contact .collaborator-tr")
                        .forEach(el => {
                            accessRights.push({
                                holder: {
                                    id: Number.parseInt(el.dataset.id),
                                    type: el.dataset.type
                                },
                                rights: el.dataset.rights
                            })
                        })
                    this.submitAccessRight(accessRights)
                    this.dialog.close()
                }
            },
            {
                type: "cancel"
            }
        ]
        this.dialog = new Dialog({
            title: gettext("Share your document with others"),
            id: "access-rights-dialog",
            width: 820,
            height: 440,
            body:
                e2eeWarningBanner +
                accessRightOverviewTemplate({
                    contacts: this.contacts,
                    collaborators
                }),
            buttons
        })
        this.dialog.open()
        this.bindDialogEvents()
        // Hide the share-link tab when multiple documents are selected
        if (!this.singleDocumentId) {
            const shareTab = this.dialog.dialogEl.querySelector(
                ".ui-tabs-nav .tab-link:last-child"
            )
            if (shareTab) {
                shareTab.style.display = "none"
            }
        }
    }

    loadShareTokens() {
        const listEl = this.dialog.dialogEl.querySelector("#share-token-list")
        listEl.innerHTML = `<p class="fw-ar-loading">${gettext("Loading…")}</p>`
        jsonPostJson("/api/document/share_token/list/", {
            document_id: this.singleDocumentId
        })
            .then(({json}) => {
                listEl.innerHTML = shareTokenListTemplate({tokens: json.tokens})
            })
            .catch(() => {
                listEl.innerHTML = `<p class="fw-ar-error">${gettext("Could not load share links.")}</p>`
            })
    }

    openCreateShareTokenDialog() {
        const createDialog = new Dialog({
            title: gettext("Create share link"),
            id: "create-share-token-dialog",
            width: 860,
            body: createShareTokenDialogTemplate(
                this.e2ee,
                this.documentPassword
            ),
            buttons: [
                {
                    text: gettext("Create"),
                    classes: "fw-dark",
                    click: () => {
                        const rights = createDialog.dialogEl.querySelector(
                            "#share-token-rights"
                        ).value
                        const expiresRaw = createDialog.dialogEl.querySelector(
                            "#share-token-expires"
                        ).value
                        const note = createDialog.dialogEl
                            .querySelector("#share-token-note")
                            .value.trim()
                        jsonPostJson("/api/document/share_token/create/", {
                            document_id: this.singleDocumentId,
                            rights,
                            expires_at: expiresRaw || "",
                            note
                        })
                            .then(({json}) => {
                                // For E2EE documents, optionally append the password to the URL fragment
                                let shareUrl = json.share_url
                                if (this.e2ee) {
                                    const passwordInput =
                                        createDialog.dialogEl.querySelector(
                                            "#share-token-password"
                                        )
                                    const password = passwordInput
                                        ? passwordInput.value.trim()
                                        : ""
                                    if (password) {
                                        shareUrl = `${shareUrl}#?password=${encodeURIComponent(password)}`
                                    }
                                }
                                json.share_url = shareUrl
                                const listEl =
                                    this.dialog.dialogEl.querySelector(
                                        "#share-token-list"
                                    )
                                // Remove the "no tokens" placeholder if present
                                const placeholder =
                                    listEl.querySelector(".fw-ar-no-tokens")
                                if (placeholder) {
                                    placeholder.remove()
                                }
                                listEl.insertAdjacentHTML(
                                    "beforeend",
                                    shareTokenRowTemplate({token: json})
                                )
                                addAlert(
                                    "success",
                                    gettext("Share link created.")
                                )
                            })
                            .catch(() =>
                                addAlert(
                                    "error",
                                    gettext("Could not create share link.")
                                )
                            )
                        createDialog.close()
                    }
                },
                {type: "cancel"}
            ]
        })
        createDialog.open()
        const expiresInput = createDialog.dialogEl.querySelector(
            "#share-token-expires"
        )
        enableDatePicker(expiresInput, true)
    }

    revokeShareToken(tokenId, rowEl) {
        jsonPostJson("/api/document/share_token/revoke/", {token_id: tokenId})
            .then(({json}) => {
                if (json.success) {
                    rowEl.remove()
                    const listEl =
                        this.dialog.dialogEl.querySelector("#share-token-list")
                    if (!listEl.querySelector(".share-token-row")) {
                        listEl.innerHTML = shareTokenListTemplate({tokens: []})
                    }
                    addAlert("success", gettext("Share link revoked."))
                } else {
                    addAlert("error", gettext("Could not revoke share link."))
                }
            })
            .catch(() =>
                addAlert("error", gettext("Could not revoke share link."))
            )
    }

    // ------------------------------------------------------------------ //
    //  Event binding
    // ------------------------------------------------------------------ //

    bindDialogEvents() {
        this.dialog.dialogEl
            .querySelector("#add-share-contact")
            .addEventListener("click", () => {
                const selectedData = []
                document
                    .querySelectorAll("#my-contacts .fw-checkable.checked")
                    .forEach(el => {
                        const collaboratorEl = document.getElementById(
                            `collaborator-${el.dataset.type}-${el.dataset.id}`
                        )
                        if (collaboratorEl) {
                            if (collaboratorEl.dataset.rights === "delete") {
                                collaboratorEl.dataset.rights = "read"
                                const accessRightIcon =
                                    collaboratorEl.querySelector(
                                        ".icon-access-right"
                                    )
                                accessRightIcon.classList.remove(
                                    "icon-access-delete"
                                )
                                accessRightIcon.classList.add(
                                    "icon-access-read"
                                )
                            }
                        } else {
                            const collaborator = this.contacts.find(
                                contact =>
                                    contact.type === el.dataset.type &&
                                    contact.id ===
                                        Number.parseInt(el.dataset.id)
                            )
                            if (!collaborator) {
                                console.warn(
                                    `No contact found of type: ${el.dataset.type} id: ${el.dataset.id}.`
                                )
                                return
                            }
                            selectedData.push({
                                holder: {
                                    id: collaborator.id,
                                    type: collaborator.type,
                                    name: collaborator.name,
                                    avatar: collaborator.avatar
                                },
                                rights: "read"
                            })
                        }
                    })

                document
                    .querySelectorAll("#my-contacts .checkable-label.checked")
                    .forEach(el => el.classList.remove("checked"))
                document
                    .querySelector("#share-contact table tbody")
                    .insertAdjacentHTML(
                        "beforeend",
                        collaboratorsTemplate({
                            collaborators: selectedData
                        })
                    )
            })
        // Tab switching
        this.dialog.dialogEl
            .querySelectorAll(".ui-tabs-nav .tab-link a")
            .forEach(linkEl => {
                linkEl.addEventListener("click", event => {
                    event.preventDefault()
                    const href = linkEl.getAttribute("href")
                    const tabName = href.substring(1)

                    this.dialog.dialogEl
                        .querySelectorAll(".tab-link")
                        .forEach(tabLinkEl =>
                            tabLinkEl.classList.remove("current-tab")
                        )
                    linkEl.parentNode.classList.add("current-tab")

                    this.dialog.dialogEl
                        .querySelectorAll(".tab-content")
                        .forEach(contentEl => {
                            if (contentEl.matches(href)) {
                                contentEl.style.display = ""
                            } else {
                                contentEl.style.display = "none"
                            }
                        })

                    if (tabName === "sharelink" && this.singleDocumentId) {
                        this.loadShareTokens()
                    }
                })
            })

        // Share-link tab: create / copy / revoke
        this.dialog.dialogEl.addEventListener("click", event => {
            const el = {}
            if (findTarget(event, "#create-share-token-btn", el)) {
                this.openCreateShareTokenDialog()
                return
            }
            if (findTarget(event, ".copy-share-token-btn", el)) {
                const url = el.target.closest(".copy-share-token-btn").dataset
                    .url
                navigator.clipboard.writeText(url).then(
                    () =>
                        addAlert(
                            "success",
                            gettext("Link copied to clipboard.")
                        ),
                    () => addAlert("error", gettext("Could not copy link."))
                )
                return
            }
            if (findTarget(event, ".revoke-share-token-btn", el)) {
                const btn = el.target.closest(".revoke-share-token-btn")
                const tokenId = Number.parseInt(btn.dataset.tokenId)
                const rowEl = btn.closest(".share-token-row")
                this.revokeShareToken(tokenId, rowEl)
                return
            }
        })

        this.dialog.dialogEl.addEventListener("click", event => {
            const el = {}
            switch (true) {
                case findTarget(event, ".fw-checkable", el):
                    setCheckableLabel(el.target)
                    break
                case findTarget(event, ".delete-collaborator", el): {
                    const colRow = el.target.closest(".collaborator-tr")
                    colRow.dataset.rights = "delete"
                    colRow
                        .querySelector(".icon-access-right")
                        .setAttribute(
                            "class",
                            "icon-access-right icon-access-delete"
                        )
                    break
                }
                case findTarget(event, ".edit-right", el): {
                    const colRow = el.target.closest(".collaborator-tr")
                    const currentRight = colRow.dataset.rights
                    const menu = this.getDropdownMenu(
                        currentRight,
                        newRight => {
                            colRow.dataset.rights = newRight
                            colRow
                                .querySelector(".icon-access-right")
                                .setAttribute(
                                    "class",
                                    `icon-access-right icon-access-${newRight}`
                                )
                        }
                    )
                    const contentMenu = new ContentMenu({
                        menu,
                        menuPos: {X: event.pageX, Y: event.pageY},
                        width: 200
                    })
                    contentMenu.open()
                    break
                }
                default:
                    break
            }
        })
    }

    submitAccessRight(newAccessRights) {
        jsonPost("/api/document/save_access_rights/", {
            document_ids: this.documentIds,
            access_rights: newAccessRights
        })
            .then(() => {
                addAlert("success", gettext("Access rights have been saved"))
                if (this.onShareSuccess) {
                    this.onShareSuccess(newAccessRights)
                }
            })
            .catch(() =>
                addAlert("error", gettext("Access rights could not be saved"))
            )
    }
}
