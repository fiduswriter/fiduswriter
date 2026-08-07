import {Dialog, addAlert, postJson} from "../../common"

const REQUESTABLE_RIGHTS = [
    {value: "read", label: gettext("Read")},
    {value: "comment", label: gettext("Comment")},
    {value: "review", label: gettext("Review")},
    {value: "write-tracked", label: gettext("Write tracked")},
    {value: "write", label: gettext("Write")}
]

const RIGHT_ORDER = REQUESTABLE_RIGHTS.map(right => right.value)

/**
 * Dialog for requesting access to a document.
 *
 * For users who already have some access, only rights that are higher than
 * the current level are offered. Token users and users without any known
 * access can choose from all requestable rights.
 */
export class RequestAccessDialog {
    constructor(
        documentId,
        currentRights = "",
        settings = {},
        isTokenUser = false
    ) {
        this.documentId = documentId
        this.currentRights = currentRights
        this.settings = settings
        this.isTokenUser = isTokenUser
    }

    open() {
        const rightsOptions = this.getRightsOptions()
        if (!rightsOptions.length) {
            addAlert(
                "error",
                gettext("You already have the highest possible access level.")
            )
            return
        }
        const defaultRights =
            rightsOptions.find(right => right.value === "write")?.value ||
            rightsOptions[rightsOptions.length - 1].value
        const bodyText = this.currentRights
            ? gettext(
                  "Select a higher access level to request from the document owner."
              )
            : gettext(
                  "You do not have access to this document. Select the access level you would like to request from the document owner."
              )
        const dialog = new Dialog({
            title: gettext("Request Access"),
            id: "request-access-dialog",
            width: 500,
            body: `<p>${bodyText}</p>
            <table class="fw-dialog-table">
                <tbody>
                    <tr>
                        <th><label for="request-access-rights">${gettext(
                            "Access level"
                        )}</label></th>
                        <td class="entry-field">
                            <select id="request-access-rights" class="fw-button fw-light fw-large">
                                ${rightsOptions
                                    .map(
                                        right =>
                                            `<option value="${right.value}"${right.value === defaultRights ? " selected" : ""}>${right.label}</option>`
                                    )
                                    .join("")}
                            </select>
                            <div class="fw-select-arrow fa-solid fa-caret-down"></div>
                        </td>
                    </tr>
                </tbody>
            </table>`,
            buttons: [
                {
                    text: gettext("Request"),
                    classes: "fw-dark",
                    click: () => {
                        const rights = dialog.dialogEl.querySelector(
                            "#request-access-rights"
                        ).value
                        postJson("/api/document/request_access/", {
                            document_id: this.documentId,
                            rights
                        })
                            .then(({json}) => {
                                if (json.success) {
                                    addAlert(
                                        "success",
                                        gettext(
                                            "Your access request has been sent to the document owner."
                                        )
                                    )
                                    dialog.close()
                                } else {
                                    addAlert(
                                        "error",
                                        json.error ||
                                            gettext(
                                                "Could not send access request."
                                            )
                                    )
                                }
                            })
                            .catch(() => {
                                addAlert(
                                    "error",
                                    gettext("Could not send access request.")
                                )
                            })
                    }
                },
                {type: "cancel"}
            ]
        })
        dialog.open()
    }

    getRightsOptions() {
        if (this.isTokenUser || !this.currentRights) {
            return REQUESTABLE_RIGHTS
        }
        const currentIndex = RIGHT_ORDER.indexOf(this.currentRights)
        if (currentIndex < 0) {
            return REQUESTABLE_RIGHTS
        }
        return REQUESTABLE_RIGHTS.filter((_, index) => index > currentIndex)
    }
}
