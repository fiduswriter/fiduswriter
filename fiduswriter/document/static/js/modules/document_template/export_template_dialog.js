import {Dialog, escapeText, findTarget, get, postJson} from "fwtoolkit"
import JSZip from "jszip"

export class ExportTemplateDialog {
    constructor(
        id,
        template,
        documentTemplateId,
        allTemplates,
        refresh,
        documentTemplateValue
    ) {
        this.id = id
        this.template = template
        this.documentTemplateId = documentTemplateId
        this.allTemplates = allTemplates
        this.refresh = refresh
        this.documentTemplateValue = documentTemplateValue
        this.addedFile = false
        this.addedFileType = false
    }

    init() {
        const buttons = [
            {
                text: gettext("Save"),
                classes: "fw-dark",
                click: () => {
                    const {errors} = this.checkCurrent()
                    if (errors.length) {
                        this.showErrors(errors)
                        return
                    }
                    this.save()
                        .then(({json}) => {
                            const exportTemplate = json.export_template[0]
                            const pk = exportTemplate.pk
                            const oldTemplateIndex =
                                this.allTemplates.findIndex(
                                    template => template.pk === pk
                                )
                            if (oldTemplateIndex > -1) {
                                this.allTemplates.splice(
                                    oldTemplateIndex,
                                    1,
                                    exportTemplate
                                )
                            } else {
                                this.allTemplates.push(exportTemplate)
                            }
                            this.refresh()
                            this.dialog.close()
                        })
                        .catch(response => {
                            if (response.json) {
                                response.json().then(json => {
                                    if (json.errors) {
                                        const errors = []
                                        Object.keys(json.errors).forEach(
                                            key => {
                                                json.errors[key].forEach(
                                                    error =>
                                                        errors.push(
                                                            `${key}: ${error}`
                                                        )
                                                )
                                            }
                                        )
                                        this.showErrors(errors)
                                    }
                                })
                            } else {
                                throw response
                            }
                        })
                }
            },
            {
                type: "cancel"
            },
            {
                text: gettext("Help"),
                click: () => this.showHelp()
            }
        ]
        if (this.id) {
            buttons.unshift({
                text: gettext("Delete"),
                classes: "fw-orange",
                click: () => this.deleteTemplateDialog()
            })
        }
        this.dialog = new Dialog({
            id: "export-template-dialog",
            title: gettext("Export template"),
            width: 400,
            body: `<table class="fw-dialog-table fw-data-table"><tbody>
                <tr>
                    <th><h4 class="fw-tablerow-title">${gettext("File")}</h4></th>
                    <td style="width: 250px;">
                        <span class="export-template-file">${
                            this.template
                                ? `<a href="${this.template.fields.template_file}">${escapeText(this.template.fields.title)}</a>`
                                : ""
                        }</span>
                    </td><td style="width: 70px;">
                        <button type="button" class="fw-media-select-button fw-button fw-light">
                            ${gettext("Select")}
                        </button>
                        <input name="image" type="file" class="fw-media-file-input">
                    </td>
                </tr>
                <tr>
                    <th><h4 class="fw-tablerow-title">${gettext("Filetype")}</h4></th>
                    <td colspan="2">
                        <span class="export-template-filetype">${
                            this.template ? this.template.fields.file_type : ""
                        }</span>
                    </td>
                </tr>
                <tr>
                    <th><h4 class="fw-tablerow-title">${gettext("Found tags")}</h4></th>
                    <td colspan="2">
                        <span class="export-template-found-tags"></span>
                    </td>
                </tr>
                <tr>
                    <th><h4 class="fw-tablerow-title">${gettext("Missing tags")}</h4></th>
                    <td colspan="2">
                        <span class="export-template-missing-tags"></span>
                    </td>
                </tr>
                </tbody></table>
                <ul class="fw-errorlist"></ul>`,
            buttons
        })
        this.dialog.open()
        this.bind()
        if (this.template) {
            this.checkRemoteFile(this.template.fields.template_file)
        }
    }

    showErrors(errors) {
        this.dialog.dialogEl.querySelector("ul.fw-errorlist").innerHTML = errors
            .map(error => `<li>${escapeText(error)}</li>`)
            .join("")
    }

    deleteTemplate() {
        postJson("/api/style/delete_export_template/", {id: this.id})
            .then(() => {
                const oldTemplateIndex = this.allTemplates.findIndex(
                    style => style.pk === this.id
                )
                if (!(typeof oldTemplateIndex === "undefined")) {
                    this.allTemplates.splice(oldTemplateIndex, 1)
                    this.refresh()
                }
                this.dialog.close()
            })
            .catch(response => {
                if (response.json) {
                    response.json().then(json => {
                        if (json.errors) {
                            const errors = []
                            Object.keys(json.errors).forEach(key => {
                                json.errors[key].forEach(error =>
                                    errors.push(`${key}: ${error}`)
                                )
                            })
                            this.showErrors(errors)
                        }
                    })
                } else {
                    throw response
                }
            })
    }

    deleteTemplateDialog() {
        const buttons = [
            {
                text: gettext("Delete"),
                classes: "fw-dark",
                click: () => {
                    dialog.close()
                    this.deleteTemplate()
                }
            },
            {
                type: "cancel"
            }
        ]
        const dialog = new Dialog({
            id: "confirmdeletion",
            icon: "exclamation-triangle",
            title: gettext("Confirm deletion"),
            body: `<p>${gettext("Do you really want to delete the export template?")}</p>`,
            height: 180,
            buttons
        })
        dialog.open()
    }

    checkCurrent() {
        const errors = []

        if (!this.addedFile) {
            errors.push(
                gettext(
                    "You need to upload a template file in ODT or DOCX format."
                )
            )
        }
        if (
            this.allTemplates.find(
                template =>
                    template.fields.title ===
                        this.addedFile.name.split(".")[0] &&
                    template.pk !== this.id
            )
        ) {
            errors.push(
                gettext(
                    "Another export file with the same filename exists already."
                )
            )
        }
        return {errors}
    }

    save() {
        const jsonData = {
            id: this.id,
            template_id: this.documentTemplateId,
            added_file_type: this.addedFileType
        }
        return postJson("/api/style/save_export_template/", jsonData, {
            added_file: this.addedFile
        })
    }

    checkRemoteFile(url) {
        return get(url)
            .then(response => response.blob())
            .then(blob => this.checkFile(blob))
    }

    checkFile(blob) {
        let fileType
        const zip = new JSZip()
        return zip
            .loadAsync(blob)
            .then(zip => {
                if (zip.files["content.xml"]) {
                    fileType = "odt"
                    return zip.files["content.xml"].async("string")
                } else if (zip.files["word/document.xml"]) {
                    fileType = "docx"
                    return zip.files["word/document.xml"].async("string")
                } else {
                    throw new Error(gettext("Unknown filetype"))
                }
            })
            .then(string => {
                const expectedTags = this.documentTemplateValue.content
                    .map(node => {
                        switch (node.type) {
                            case "title":
                                return "title"
                            case "richtext_part":
                            case "table_part":
                                return `@${node.attrs.id}`
                            case "heading_part":
                            case "contributors_part":
                            case "tags_part":
                                return node.attrs.id
                            default:
                                return false
                        }
                    })
                    .concat(["@bibliography", "@copyright", "@licenses"])
                    .filter(tag => tag)
                const parser = new window.DOMParser()
                const xml = parser.parseFromString(string, "text/xml")
                if (fileType === "odt") {
                    this.checkODT(xml, expectedTags)
                } else {
                    this.checkDOCX(xml, expectedTags)
                }
                return fileType
            })
    }

    setStatus(_fileType, foundTags, missingTags) {
        this.dialog.dialogEl.querySelector(
            ".export-template-found-tags"
        ).innerHTML = foundTags.join(", ")
        this.dialog.dialogEl.querySelector(
            ".export-template-missing-tags"
        ).innerHTML = missingTags.join(", ")
    }

    checkTagPresence(text, tag) {
        // Simple replacement: {tag}
        if (text.includes(`{${tag}}`)) {
            return true
        }
        // Format string: {tag:format=...}
        if (text.includes(`{${tag}:format=`)) {
            return true
        }
        // Loop block: {BEGIN_tag} or {BEGIN_tag:limit=N}
        if (
            text.includes(`{BEGIN_${tag}}`) ||
            text.includes(`{BEGIN_${tag}:limit=`)
        ) {
            return true
        }
        // Conditional referencing tag: {IF(tag...)} or {ELIF(tag...)}
        const ifRegex = new RegExp(`\\{IF\\(${tag}\\.`, "g")
        const elifRegex = new RegExp(`\\{ELIF\\(${tag}\\.`, "g")
        if (ifRegex.test(text) || elifRegex.test(text)) {
            return true
        }
        return false
    }

    checkODT(xml, expectedTags) {
        const pars = xml.querySelectorAll("p")
        const foundTags = []

        pars.forEach(par => {
            const text = par.textContent
            expectedTags.forEach(tag => {
                if (this.checkTagPresence(text, tag)) {
                    foundTags.push(tag)
                }
            })
        })

        this.setStatus(
            "odt",
            foundTags,
            expectedTags.filter(tag => !foundTags.includes(tag))
        )
    }

    checkDOCX(xml, expectedTags) {
        const pars = xml.querySelectorAll("p,sectPr")
        const foundTags = []

        pars.forEach(par => {
            const text = par.textContent
            expectedTags.forEach(tag => {
                if (this.checkTagPresence(text, tag)) {
                    foundTags.push(tag)
                }
            })
        })

        this.setStatus(
            "docx",
            foundTags,
            expectedTags.filter(tag => !foundTags.includes(tag))
        )
    }

    bind() {
        const mediaInputSelector = this.dialog.dialogEl.querySelector(
            ".fw-media-file-input"
        )
        this.dialog.dialogEl.addEventListener("click", event => {
            const el = {}
            switch (true) {
                case findTarget(event, ".fw-media-select-button", el): {
                    event.preventDefault()
                    mediaInputSelector.click()
                    break
                }
            }
        })

        mediaInputSelector.addEventListener("change", () => {
            this.showErrors([])
            const mediaInput = mediaInputSelector.files[0]
            if (!mediaInput) {
                return
            }
            this.checkFile(mediaInput)
                .then(fileType => {
                    this.addedFile = mediaInput
                    this.addedFileType = fileType
                    this.dialog.dialogEl.querySelector(
                        ".export-template-file"
                    ).innerHTML = escapeText(mediaInput.name)
                })
                .catch(() => {
                    this.showErrors([gettext("Selected file not supported.")])
                })
        })
    }

    showHelp() {
        const helpContent = `
            <div class="help-panel">
                <h3>${gettext("Templating Syntax Help")}</h3>

                <h4>${gettext("Available Tags")}</h4>
                <ul>
                    <li><code>{title}</code> - ${gettext("Document title")}</li>
                    <li><code>{authors}</code> - ${gettext("All authors (simple)")}</li>
                    <li><code>{keywords}</code> - ${gettext("Keywords")}</li>
                    <li><code>@bibliography</code> - ${gettext("Bibliography block")}</li>
                    <li><code>@copyright</code> - ${gettext("Copyright block")}</li>
                    <li><code>@licenses</code> - ${gettext("Licenses block")}</li>
                </ul>

                <h4>${gettext("Format Strings with Delimiters")}</h4>
                <p>${interpolate(gettext("Syntax: %s"), ["<code>{tag:format=%firstname %lastname|delimiter}</code>"])}</p>
                <ul>
                    <li><code>%firstname</code> - ${gettext("First name")}</li>
                    <li><code>%lastname</code> - ${gettext("Last name")}</li>
                    <li><code>%institution</code> - ${gettext("Institution")}</li>
                    <li><code>%email</code> - ${gettext("Email")}</li>
                    <li><code>%id_type</code> - ${gettext("ID type (e.g., ORCID)")}</li>
                    <li><code>%id_value</code> - ${gettext("ID value")}</li>
                </ul>
                <p>${gettext("Delimiters: ")}<code>;</code> ${gettext("(semicolon+space), ")}<code>,\\n</code> ${gettext("(comma+line break), ")}<code>\\n</code> ${gettext("(line break), ")}<code>\\p</code> ${gettext("(paragraph break), or custom string")}</p>

                <h4>${gettext("Structured Blocks")}</h4>
                <ul>
                    <li><code>{BEGIN_tag}...{END_tag}</code> - ${gettext("Loop over items")}</li>
                    <li><code>{BEGIN_tag:limit=N}...{END_tag}</code> - ${gettext("Loop with limit")}</li>
                </ul>

                <h4>${gettext("Conditionals")}</h4>
                <ul>
                    <li><code>{IF(expression)}...{ENDIF}</code> - ${gettext("Conditional")}</li>
                    <li><code>{ELIF(expression)}</code> - ${gettext("Else if")}</li>
                    <li><code>{ELSE}</code> - ${gettext("Else")}</li>
                </ul>

                <h4>${gettext("Context")}</h4>
                <p>${gettext("Context object: ")}<code>ctx.count</code>, <code>ctx.first</code>, <code>ctx.last</code>, <code>ctx.index</code>, <code>ctx.item</code></p>

                <h4>${gettext("Examples")}</h4>
                <pre>
{BEGIN_authors}
    &lt;w:p&gt;{%firstname} {%lastname}&lt;/w:p&gt;
{END_authors}
                </pre>
                <pre>
{IF(authors.count >= 3)}
    &lt;w:tr&gt;
        {BEGIN_authors:limit=2}
            &lt;w:tc&gt;&lt;w:p&gt;{%firstname} {%lastname}&lt;/w:p&gt;&lt;/w:tc&gt;
        {END_authors}
        &lt;w:tc&gt;&lt;w:p&gt;${gettext("et al.")}&lt;/w:p&gt;
    &lt;/w:tr&gt;
{ENDIF}
                </pre>
            </div>`

        const helpDialog = new Dialog({
            id: "template-help",
            title: gettext("Templating Help"),
            body: helpContent,
            width: 600,
            height: 500
        })
        helpDialog.open()
    }
}
