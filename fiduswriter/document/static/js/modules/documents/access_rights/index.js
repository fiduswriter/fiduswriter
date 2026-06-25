import {
    ContentMenu,
    Dialog,
    DialogTabs,
    addAlert,
    enableDatePicker,
    ensureCSS,
    findTarget,
    post,
    postJson,
    setCheckableLabel
} from "fwtoolkit"

ensureCSS(staticUrl("css/checkable_list.css"))
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
 * Build the collaborators list from raw access rights and document IDs.
 */
function getCollaborators(accessRights, documentIds) {
    const docCollabs = {}
    accessRights.forEach(ar => {
        if (!documentIds.includes(ar.document_id)) {
            return
        }
        const holderIdent = ar.holder.type + ar.holder.id
        if (docCollabs[holderIdent]) {
            if (docCollabs[holderIdent].rights != ar.rights) {
                docCollabs[holderIdent].rights = "read"
            }
            docCollabs[holderIdent].count += 1
        } else {
            docCollabs[holderIdent] = Object.assign({}, ar)
            docCollabs[holderIdent].count = 1
        }
    })
    return Object.values(docCollabs).filter(
        col => col.count === documentIds.length
    )
}

/**
 * Collect access rights from the DOM inside a given container.
 */
function collectAccessRights(container) {
    const accessRights = []
    container
        .querySelectorAll("#share-contact .fw-collaborator-tr")
        .forEach(el => {
            accessRights.push({
                holder: {
                    id: Number.parseInt(el.dataset.id),
                    type: el.dataset.type
                },
                rights: el.dataset.rights
            })
        })
    return accessRights
}

/**
 * Reusable access-rights tab / panel.
 *
 * Can be embedded inside another dialog (e.g. the Document Settings dialog)
 * or wrapped in its own Dialog via DocumentAccessRightsDialog.
 */
export class AccessRightsTab {
    constructor({
        documentIds,
        contacts,
        newContactCall,
        e2ee,
        documentPassword,
        onShareSuccess,
        settings,
        container = null
    }) {
        this.documentIds = documentIds
        this.contacts = contacts
        this.newContactCall = newContactCall
        this.singleDocumentId = documentIds.length === 1 ? documentIds[0] : null
        this.e2ee = e2ee
        this.documentPassword = documentPassword
        this.onShareSuccess = onShareSuccess
        this.settings = settings
        this.container = container
        this.accessRights = []
    }

    load() {
        return postJson("/api/document/get_access_rights/", {
            document_ids: this.documentIds
        })
            .catch(error => {
                addAlert("error", gettext("Cannot load document access data."))
                throw error
            })
            .then(({json}) => {
                this.accessRights = json.access_rights
            })
    }

    render() {
        const collaborators = getCollaborators(
            this.accessRights,
            this.documentIds
        )

        const e2eeWarningBanner = this.e2ee
            ? `<div class="e2ee-access-rights-warning">
                <strong><i class="fa-solid fa-lock"></i> ${gettext("End-to-end encrypted document")}</strong>
                <p>${gettext("This document is end-to-end encrypted. Collaborators without a personal passphrase will need the document password shared with them through a secure channel outside of Fidus Writer. Do not send the password through the document chat.")}</p>
            </div>`
            : ""

        const html =
            e2eeWarningBanner +
            accessRightOverviewTemplate({
                contacts: this.contacts,
                collaborators
            })

        if (this.container) {
            this.container.innerHTML = html
        }
        return html
    }

    bindEvents() {
        const container = this.container
        if (!container) {
            return
        }

        // Add selected contacts to collaborators
        container
            .querySelector("#add-share-contact")
            .addEventListener("click", () => {
                const selectedData = []
                container
                    .querySelectorAll("#my-contacts .fw-checkable.fw-checked")
                    .forEach(el => {
                        const collaboratorEl = container.querySelector(
                            `#collaborator-${el.dataset.type}-${el.dataset.id}`
                        )
                        if (collaboratorEl) {
                            if (collaboratorEl.dataset.rights === "delete") {
                                collaboratorEl.dataset.rights = "read"
                                const accessRightIcon =
                                    collaboratorEl.querySelector(
                                        ".fw-icon-access-right"
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

                container
                    .querySelectorAll(
                        "#my-contacts .checkable-label.fw-checked"
                    )
                    .forEach(el => el.classList.remove("fw-checked"))
                container
                    .querySelector("#share-contact table tbody")
                    .insertAdjacentHTML(
                        "beforeend",
                        collaboratorsTemplate({
                            collaborators: selectedData
                        })
                    )
            })

        // Inner tab switching (People / Share link)
        const dialogTabs = new DialogTabs(
            [
                {id: "people", title: gettext("People"), template: () => ""},
                {
                    id: "sharelink",
                    title: gettext("Share link"),
                    template: () => ""
                }
            ],
            {
                onShow: index => {
                    if (
                        index === 1 && // Share link tab
                        this.singleDocumentId
                    ) {
                        this.loadShareTokens()
                    }
                }
            }
        )
        dialogTabs.bind(container)

        // Share-link actions
        container.addEventListener("click", event => {
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

        // Collaborator actions
        container.addEventListener("click", event => {
            const el = {}
            switch (true) {
                case findTarget(event, ".fw-checkable", el):
                    setCheckableLabel(el.target)
                    break
                case findTarget(event, ".delete-collaborator", el): {
                    const colRow = el.target.closest(".fw-collaborator-tr")
                    colRow.dataset.rights = "delete"
                    colRow
                        .querySelector(".fw-icon-access-right")
                        .setAttribute(
                            "class",
                            "fw-icon-access-right icon-access-delete"
                        )
                    break
                }
                case findTarget(event, ".edit-right", el): {
                    const colRow = el.target.closest(".fw-collaborator-tr")
                    const currentRight = colRow.dataset.rights
                    const menu = this.getDropdownMenu(
                        currentRight,
                        newRight => {
                            colRow.dataset.rights = newRight
                            colRow
                                .querySelector(".fw-icon-access-right")
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

    getDropdownMenu(currentRight, onChange) {
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
                action: () => onChange("write"),
                selected: currentRight === "write"
            },
            {
                type: "action",
                title: gettext("Write tracked"),
                icon: "pencil-alt",
                tooltip: gettext("Write with changes tracked"),
                right: "write-tracked",
                action: () => onChange("write-tracked"),
                selected: currentRight === "write-tracked"
            },
            {
                type: "action",
                title: gettext("Comment"),
                icon: "comment",
                tooltip: gettext("Comment"),
                right: "comment",
                action: () => onChange("comment"),
                selected: currentRight === "comment"
            },
            {
                type: "action",
                title: gettext("Read"),
                icon: "eye",
                tooltip: gettext("Read"),
                right: "read",
                action: () => onChange("read"),
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
                action: () => onChange("read-without-comments"),
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
                action: () => onChange("review"),
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
                action: () => onChange("review-tracked"),
                selected: currentRight === "review-tracked"
            }
        ]

        const content = this.e2ee
            ? allItems.filter(item => {
                  if (item.type === "header") {
                      return true
                  }
                  return E2EE_ALLOWED_RIGHTS.includes(item.right)
              })
            : allItems

        const filteredContent = content.filter((item, index) => {
            if (item.type === "header") {
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

    loadShareTokens() {
        const listEl = this.container.querySelector("#share-token-list")
        if (!listEl) {
            return
        }
        listEl.innerHTML = `<p class="fw-ar-loading">${gettext("Loading…")}</p>`
        postJson("/api/document/share_token/list/", {
            document_id: this.singleDocumentId
        })
            .then(({json}) => {
                listEl.innerHTML = shareTokenListTemplate({
                    tokens: json.tokens
                })
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
                        postJson("/api/document/share_token/create/", {
                            document_id: this.singleDocumentId,
                            rights,
                            expires_at: expiresRaw || "",
                            note
                        })
                            .then(({json}) => {
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
                                    this.container.querySelector(
                                        "#share-token-list"
                                    )
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
        postJson("/api/document/share_token/revoke/", {token_id: tokenId})
            .then(({json}) => {
                if (json.success) {
                    rowEl.remove()
                    const listEl =
                        this.container.querySelector("#share-token-list")
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

    submit() {
        const accessRights = collectAccessRights(this.container)
        return post("/api/document/save_access_rights/", {
            document_ids: this.documentIds,
            access_rights: accessRights
        })
            .then(() => {
                addAlert("success", gettext("Access rights have been saved"))
                if (this.onShareSuccess) {
                    this.onShareSuccess(accessRights)
                }
            })
            .catch(() =>
                addAlert("error", gettext("Access rights could not be saved"))
            )
    }
}

/**
 * Standalone dialog wrapper around AccessRightsTab.
 * Supports both single-document and bulk-document editing.
 */
export class DocumentAccessRightsDialog {
    constructor(
        documentIds,
        contacts,
        newContactCall,
        e2ee,
        documentPassword,
        onShareSuccess,
        settings
    ) {
        this.documentIds = documentIds
        this.contacts = contacts
        this.newContactCall = newContactCall
        this.e2ee = e2ee
        this.documentPassword = documentPassword
        this.onShareSuccess = onShareSuccess
        this.settings = settings
    }

    init() {
        this.tab = new AccessRightsTab({
            documentIds: this.documentIds,
            contacts: this.contacts,
            newContactCall: this.newContactCall,
            e2ee: this.e2ee,
            documentPassword: this.documentPassword,
            onShareSuccess: this.onShareSuccess,
            settings: this.settings
        })
        this.tab.load().then(() => this.createDialog())
    }

    createDialog() {
        const html = this.tab.render()

        const buttons = [
            {
                text:
                    this.settings?.REGISTRATION_OPEN ||
                    this.settings?.SOCIALACCOUNT_OPEN
                        ? gettext("Add contact or invite new user")
                        : gettext("Add contact"),
                classes: "fw-light fw-add-button",
                click: () => {
                    const dialog = new AddContactDialog(this.settings)
                    dialog.init().then(contactsData => {
                        contactsData.forEach(contactData => {
                            if (contactData.id) {
                                this.tab.container
                                    .querySelector(
                                        "#my-contacts .fw-data-table-body"
                                    )
                                    .insertAdjacentHTML(
                                        "beforeend",
                                        contactsTemplate({
                                            contacts: [contactData]
                                        })
                                    )
                                this.tab.container
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
                                this.tab.container
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
                    this.tab.submit().then(() => this.dialog.close())
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
            body: html,
            buttons
        })
        this.dialog.open()

        // Set the container so events/bindings work on the dialog element
        this.tab.container = this.dialog.dialogEl
        this.tab.bindEvents()

        // Hide the share-link tab when multiple documents are selected
        if (!this.tab.singleDocumentId) {
            const shareTab = this.dialog.dialogEl.querySelector(
                ".fw-tabs-nav .fw-tab-link:last-child"
            )
            if (shareTab) {
                shareTab.style.display = "none"
            }
        }
    }
}
