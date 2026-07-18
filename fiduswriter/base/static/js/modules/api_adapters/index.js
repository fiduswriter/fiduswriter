import {get, getJson, post, postBare, postJson} from "fwtoolkit"

// ---- DocumentListApi ----
export class DjangoDocumentListApi {
    getDocumentList() {
        return postJson("/api/document/documentlist/")
    }

    getDocumentListExtra(ids) {
        return postJson("/api/document/documentlist/extra/", {ids})
    }

    deleteDocument(data) {
        return postJson("/api/document/delete/", data)
    }

    moveDocument(data) {
        return postJson("/api/document/move/", data)
    }

    getEncryptionKeys() {
        return postJson("/api/document/encryption_key/get_all/", {})
    }
}

// ---- DocumentImportApi ----
export class DjangoDocumentImportApi {
    createDoc(data, files) {
        if (files) {
            return postJson("/api/document/create/", data, null, files)
        }
        return postJson("/api/document/create/", data)
    }

    saveImage(data, files) {
        return postJson("/api/usermedia/save/", data, null, files)
    }

    saveE2EEImage(data, files) {
        return postJson("/api/usermedia/save_e2ee_image/", data, null, files)
    }

    saveDocument(data) {
        return postJson("/api/document/save/", data)
    }

    getTemplate(importId) {
        return postJson("/api/document/import/template/", {import_id: importId})
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
        return post("/api/user/avatar/upload/", {}, null, files)
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
        return postJson("/api/user/email/get_confirm_key_data/", data)
    }

    confirmEmail(key) {
        return post("/api/user/email/confirm/", {key})
    }
}

// ---- AuthApi ----
export class DjangoAuthApi {
    login(data) {
        return postBare("/api/user/login/", data)
            .then(response =>
                response.json().then(json => ({json, status: response.status}))
            )
            .catch(response => {
                if (
                    !(response instanceof Response) ||
                    response.status !== 400
                ) {
                    return Promise.reject(response)
                }
                return response
                    .json()
                    .then(json => ({json, status: response.status}))
            })
    }

    signup(data) {
        return postBare("/api/user/signup/", data).then(response =>
            response.json().then(json => ({json}))
        )
    }

    passwordReset(data) {
        return post("/api/user/password/reset/", data)
    }

    passwordResetKeyGet(key) {
        return getJson(`/api/user/password/reset/key/${key}/`).then(json => ({
            url: json.url || `/api/user/password/reset/key/${key}/`
        }))
    }

    passwordResetKeyPost(url, data) {
        return post(url, data)
    }

    twoFactorSetup() {
        return postJson("/api/user/two_factor/setup/")
    }

    twoFactorVerify(data) {
        return postJson("/api/user/two_factor/verify/", data)
    }

    twoFactorLogin(data) {
        return postJson("/api/user/two_factor/login/", data)
    }

    twoFactorDisable() {
        return postJson("/api/user/two_factor/disable/")
    }

    twoFactorStatus() {
        return postJson("/api/user/two_factor/status/")
    }
}

// ---- ContactsApi ----
export class DjangoContactsApi {
    list() {
        return postJson("/api/user/contacts/list/")
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
        return postJson("/api/user/invite/", data)
    }
}

// ---- DocumentTemplateApi ----
export class DjangoDocumentTemplateApi {
    list() {
        return postJson("/api/user_template_manager/list/")
    }

    get(data) {
        return postJson("/api/user_template_manager/get/", data)
    }

    save(data) {
        return post("/api/user_template_manager/save/", data)
    }

    delete(data) {
        return postJson("/api/user_template_manager/delete/", data)
    }

    create(data, files) {
        if (files) {
            return post("/api/user_template_manager/create/", data, null, files)
        }
        return post("/api/user_template_manager/create/", data)
    }

    copy(data) {
        return postJson("/api/user_template_manager/copy/", data)
    }
}

// ---- FlatPageApi ----
export class DjangoFlatPageApi {
    get(key) {
        return postJson("/api/base/flatpage/", {url: key})
    }
}

// ---- SystemMessageApi ----
export class DjangoSystemMessageApi {
    get() {
        return getJson("/api/base/system_message/")
    }

    send(data) {
        return postJson("/api/base/send_system_message/", data)
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

// ---- ConfigApi ----
export class DjangoConfigApi {
    getConfiguration() {
        return getJson("/api/base/configuration/")
    }
}

// ---- MaintenanceApi ----
export class DjangoMaintenanceApi {
    getAllOldDocs() {
        return postJson("/api/document/admin/get_all_old/")
    }

    getUserBibList(data) {
        return postJson("/api/document/admin/get_user_biblist/", data)
    }

    saveDoc(data) {
        return post("/api/document/admin/save_doc/", data)
    }

    addImagesToDoc(data) {
        return post("/api/document/admin/add_images_to_doc/", data)
    }

    getAllTemplateIds() {
        return postJson("/api/document/admin/get_all_template_ids/")
    }

    getTemplateBase(data) {
        return postJson("/api/document/admin/get_template/base/", data)
    }

    saveTemplate(data) {
        return post("/api/document/admin/save_template/", data)
    }

    getAllRevisionIds() {
        return postJson("/api/document/admin/get_all_revision_ids/")
    }

    getRevision(id) {
        return get(`/api/document/get_revision/${id}/`)
    }

    updateRevision(id, blob) {
        return post("/api/document/admin/update_revision/", {id}, null, {
            file: {
                file: blob,
                filename: "some_file.fidus"
            }
        })
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
    config: new DjangoConfigApi(),
    maintenance: new DjangoMaintenanceApi(),
    revision: new DjangoRevisionApi()
}
