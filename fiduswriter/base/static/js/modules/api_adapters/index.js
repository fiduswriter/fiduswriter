import {get, getJson, post, postBare, postJson} from "fwtoolkit"

// ---- DocumentListApi ----
export class DjangoDocumentListApi {
    getDocumentList() {
        return postJson("/api/document/documentlist/").then(({json}) => json)
    }

    getDocumentListExtra(ids) {
        return postJson("/api/document/documentlist/extra/", {ids}).then(
            ({json}) => json
        )
    }

    deleteDocument(data) {
        return postJson("/api/document/delete/", data).then(({json}) => json)
    }

    moveDocument(data) {
        return postJson("/api/document/move/", data).then(({json}) => json)
    }

    getEncryptionKeys() {
        return postJson("/api/document/encryption_key/get_all/", {}).then(
            ({json}) => json
        )
    }
}

// ---- DocumentImportApi ----
export class DjangoDocumentImportApi {
    createDoc(data, files) {
        if (files) {
            return postJson("/api/document/import/create/", data, files).then(
                ({json}) => json
            )
        }
        return postJson("/api/document/import/create/", data).then(
            ({json}) => json
        )
    }

    saveImage(data, files) {
        return postJson("/api/usermedia/save/", data, files).then(
            ({json}) => json
        )
    }

    saveE2EEImage(data, files) {
        return postJson("/api/document/e2ee_image/", data, files).then(
            ({json}) => json
        )
    }

    saveDocument(data) {
        return postJson("/api/document/save/", data).then(({json}) => json)
    }

    getTemplate(importId) {
        return postJson("/api/document/get_template/", {
            import_id: importId
        }).then(({json}) => json)
    }
}

// ---- UserProfileApi ----
export class DjangoUserProfileApi {
    save(data) {
        return post("/api/user/save/", data)
    }

    updatePreferences(data) {
        return post("/api/user/preferences/update/", data)
    }

    avatarUpload(files) {
        return post("/api/user/avatar/upload/", {}, files)
    }

    avatarDelete() {
        return post("/api/user/avatar/delete/", {})
    }

    passwordChange(data) {
        return postBare("/api/user/passwordchange/", data).then(response =>
            response.json().then(json => ({json, status: response.status}))
        )
    }

    emailAdd(data) {
        return postBare("/api/user/email/add/", data).then(response =>
            response.json().then(json => ({json, status: response.status}))
        )
    }

    emailDelete(data) {
        return post("/api/user/email/delete/", data)
    }

    emailPrimary(data) {
        return post("/api/user/email/primary/", data)
    }

    deleteUser(data) {
        return postBare("/api/user/delete/", data)
    }

    getSocialAccounts() {
        return getJson("/api/user/social/accounts/")
    }

    deleteSocialAccount(data) {
        return post("/api/user/social/delete/", data)
    }

    getConfirmKeyData(data) {
        return postJson("/api/user/get_confirmkey_data/", data).then(
            ({json}) => json
        )
    }

    confirmEmail(key) {
        return post(`/api/user/confirm-email/${key}/`)
    }
}

// ---- AuthApi ----
export class DjangoAuthApi {
    login(data) {
        return postJson("/api/user/login/", data)
    }

    signup(data) {
        return postJson("/api/user/signup/", data).then(({json}) => ({json}))
    }

    passwordReset(data) {
        return post("/api/user/password/reset/", data)
    }

    passwordResetKeyGet(key) {
        return get(`/api/account/password/reset/key/${key}/`).then(
            response => ({
                url: response.url
            })
        )
    }

    passwordResetKeyPost(url, data) {
        return post(url, data)
    }

    logout() {
        return post("/api/user/logout/")
    }

    twoFactorSetup() {
        return postJson("/api/user/two-factor/setup/").then(({json}) => json)
    }

    twoFactorVerify(data) {
        return postJson("/api/user/two-factor/verify/", data).then(
            ({json}) => json
        )
    }

    twoFactorLogin(data) {
        return postJson("/api/user/login/", data).then(({json}) => json)
    }

    twoFactorDisable() {
        return postJson("/api/user/two-factor/disable/").then(({json}) => json)
    }

    twoFactorStatus() {
        return postJson("/api/user/two-factor/status/").then(({json}) => json)
    }
}

// ---- ContactsApi ----
export class DjangoContactsApi {
    list() {
        return postJson("/api/user/contacts/list/").then(({json}) => json)
    }

    delete(data) {
        return postBare("/api/user/contacts/delete/", data).then(response => ({
            status: response.status
        }))
    }

    add(data) {
        return postBare("/api/user/invites/add/", data).then(response =>
            response.json().then(json => ({json, status: response.status}))
        )
    }

    accept(data) {
        return postBare("/api/user/invites/accept/", data).then(response =>
            response.json().then(json => ({json, status: response.status}))
        )
    }

    decline(data) {
        return postBare("/api/user/invites/decline/", data).then(response => ({
            status: response.status
        }))
    }

    invite(data) {
        return postJson("/api/user/invite/", data).then(({json}) => json)
    }
}

// ---- DocumentTemplateApi ----
export class DjangoDocumentTemplateApi {
    list() {
        return getJson("/api/user_template_manager/list/")
    }

    get(data) {
        return postJson("/api/user_template_manager/get/", data).then(
            ({json}) => json
        )
    }

    save(data) {
        return post("/api/user_template_manager/save/", data)
    }

    delete(data) {
        return postJson("/api/user_template_manager/delete/", data).then(
            ({json}) => json
        )
    }

    create(data, files) {
        if (files) {
            return post("/api/user_template_manager/create/", data, files)
        }
        return post("/api/user_template_manager/create/", data)
    }

    copy(data) {
        return postJson("/api/user_template_manager/copy/", data).then(
            ({json}) => json
        )
    }
}

// ---- FlatPageApi ----
export class DjangoFlatPageApi {
    get(key) {
        return postJson("/api/base/flatpage/", {url: key}).then(
            ({json}) => json
        )
    }
}

// ---- SystemMessageApi ----
export class DjangoSystemMessageApi {
    get() {
        return getJson("/api/base/connection_info/")
    }

    send(data) {
        return postJson("/api/base/send_system_message/", data).then(
            ({json}) => json
        )
    }
}

// ---- ErrorHookApi ----
export class DjangoErrorHookApi {
    send(data) {
        const body = new FormData()
        body.append("context", data.context || navigator.userAgent)
        body.append("details", data.details)
        return fetch("/api/django_js_error_hook/", {
            method: "POST",
            headers: {
                "X-CSRFToken": window.settings.getCsrfToken()
            },
            credentials: "include",
            body
        })
    }
}

// ---- FeedbackApi ----
export class DjangoFeedbackApi {
    send(data) {
        return post("/api/feedback/feedback/", data)
    }
}

// ---- ConfigApi ----
export class DjangoConfigApi {
    getConfiguration() {
        return getJson("/api/base/configuration/")
    }
}

// ---- MaintenanceApi ----
export class DjangoMaintenanceApi {
    getAllOldDocs() {
        return postJson("/api/document/admin/get_all_old/").then(
            ({json}) => json
        )
    }

    getUserBibList(data) {
        return postJson("/api/document/admin/get_user_biblist/", data).then(
            ({json}) => json
        )
    }

    saveDoc(data) {
        return post("/api/document/admin/save_doc/", data)
    }

    addImagesToDoc(data) {
        return post("/api/document/admin/add_images_to_doc/", data)
    }

    getAllTemplateIds() {
        return postJson("/api/document/admin/get_all_template_ids/").then(
            ({json}) => json
        )
    }

    getTemplateBase(data) {
        return postJson("/api/document/admin/get_template/base/", data).then(
            ({json}) => json
        )
    }

    saveTemplate(data) {
        return post("/api/document/admin/save_template/", data)
    }

    getAllRevisionIds() {
        return postJson("/api/document/admin/get_all_revision_ids/").then(
            ({json}) => json
        )
    }

    getRevision(id) {
        return get(`/api/document/get_revision/${id}/`)
    }

    updateRevision(id, blob) {
        return post(
            "/api/document/admin/update_revision/",
            {id},
            {
                file: {
                    file: blob,
                    filename: "some_file.fidus"
                }
            }
        )
    }
}

// ---- RevisionApi ----
export class DjangoRevisionApi {
    getRevisionBlob(id) {
        return get(`/api/document/get_revision/${id}/`).then(response =>
            response.blob()
        )
    }

    deleteRevision(data) {
        return post("/api/document/delete_revision/", data)
    }
}

// ---- Bundled connectors ----
export const djangoApiConnectors = {
    documentList: new DjangoDocumentListApi(),
    documentImport: new DjangoDocumentImportApi(),
    userProfile: new DjangoUserProfileApi(),
    auth: new DjangoAuthApi(),
    contacts: new DjangoContactsApi(),
    documentTemplate: new DjangoDocumentTemplateApi(),
    flatPage: new DjangoFlatPageApi(),
    systemMessage: new DjangoSystemMessageApi(),
    errorHook: new DjangoErrorHookApi(),
    feedback: new DjangoFeedbackApi(),
    config: new DjangoConfigApi(),
    maintenance: new DjangoMaintenanceApi(),
    revision: new DjangoRevisionApi()
}
