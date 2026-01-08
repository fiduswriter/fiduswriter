import {Dialog, dropdownSelect} from "../../common"
import {randomCodeBlockId} from "../../schema/document/content"
import {CATS} from "../../schema/i18n"

export class CodeBlockDialog {
    constructor(editor) {
        this.editor = editor
        this.language = ""
        this.category = ""
        this.title = ""
        this.id = ""
        this.insideCodeBlock = false
        this.node = false
        this.submitMessage = gettext("Insert")
        this.dialog = false
    }

    findCodeBlock(state) {
        if (
            state.selection.node &&
            state.selection.node.type.name === "code_block"
        ) {
            return state.selection.node
        }
        const $head = state.selection.$head
        for (let d = $head.depth; d > 0; d--) {
            if ($head.node(d).type.name === "code_block") {
                return $head.node(d)
            }
        }
        return false
    }

    submitForm() {
        const view = this.editor.currentView
        const {state} = view
        const {schema} = state

        if (this.insideCodeBlock) {
            // Update existing code block
            const newAttrs = Object.assign({}, this.node.attrs, {
                language: this.language,
                category: this.category,
                title: this.title,
                id: this.id || (this.category ? randomCodeBlockId() : "")
            })

            const tr = state.tr.setNodeMarkup(
                state.selection.$from.before(
                    state.selection.$from.depth - (state.selection.node ? 0 : 1)
                ),
                null,
                newAttrs
            )
            view.dispatch(tr)
        } else {
            // Insert new code block
            const codeBlockNode = schema.nodes.code_block.create({
                language: this.language,
                category: this.category,
                title: this.title,
                id: this.category ? randomCodeBlockId() : ""
            })
            const tr = state.tr.replaceSelectionWith(codeBlockNode)
            view.dispatch(tr)
        }

        this.dialog.close()
    }

    getEnabledCategories() {
        const codeCategories =
            this.editor.view.state.doc.attrs.code_categories || {}
        const categories = []

        Object.entries(codeCategories).forEach(([key, value]) => {
            if (value.enabled) {
                categories.push(key)
            }
        })

        return categories
    }

    getAvailableLanguages() {
        return this.editor.view.state.doc.attrs.code_languages || []
    }

    init() {
        this.node = this.findCodeBlock(this.editor.currentView.state)

        if (this.node?.attrs?.track?.find(track => track.type === "deletion")) {
            // The code block is marked as deleted so we don't allow editing it.
            return true
        }

        const buttons = []

        if (this.node?.type && this.node?.type.name === "code_block") {
            this.insideCodeBlock = true
            this.submitMessage = gettext("Update")
            this.language = this.node.attrs.language || ""
            this.category = this.node.attrs.category || ""
            this.title = this.node.attrs.title || ""
            this.id = this.node.attrs.id || ""

            buttons.push({
                text: gettext("Remove"),
                classes: "fw-orange",
                click: () => {
                    const tr =
                        this.editor.currentView.state.tr.deleteSelection()
                    this.editor.currentView.dispatch(tr)
                    this.dialog.close()
                }
            })
        }

        buttons.push({
            text: this.submitMessage,
            classes: "fw-dark",
            click: () => this.submitForm()
        })

        buttons.push({
            type: "cancel"
        })

        const language = this.editor.view.state.doc.attrs.language
        const enabledCategories = this.getEnabledCategories()
        const availableLanguages = this.getAvailableLanguages()

        this.dialog = new Dialog({
            id: "code-block-dialog",
            title: gettext("Configure code block"),
            body: this.getDialogTemplate(
                language,
                enabledCategories,
                availableLanguages
            ),
            buttons,
            onClose: () => this.editor.currentView.focus()
        })

        this.dialog.open()

        // Language selector
        const languageSelector = dropdownSelect(
            this.dialog.dialogEl.querySelector(".code-block-language"),
            {
                onChange: newValue => {
                    this.language = newValue
                },
                width: "80%",
                value: this.language
            }
        )
        this.languageSelector = languageSelector

        // Category selector
        if (enabledCategories.length > 0) {
            const categorySelector = dropdownSelect(
                this.dialog.dialogEl.querySelector(".code-block-category"),
                {
                    onChange: newValue => {
                        this.category = newValue
                    },
                    width: "80%",
                    value: this.category
                }
            )
            this.categorySelector = categorySelector
        }

        // Title input
        const titleInput =
            this.dialog.dialogEl.querySelector(".code-block-title")
        if (titleInput) {
            titleInput.value = this.title
            titleInput.addEventListener("input", () => {
                this.title = titleInput.value
            })
        }
    }

    getDialogTemplate(language, enabledCategories, availableLanguages) {
        return `<table class="fw-dialog-table">
            <tbody>
                <tr>
                    <th><h4 class="fw-tablerow-title">${gettext("Language")}</h4></th>
                    <td>
                        <select class="code-block-language">
                            <option value="">${gettext("None")}</option>
                            ${availableLanguages
                                .map(
                                    lang =>
                                        `<option value="${lang}">${lang}</option>`
                                )
                                .join("")}
                        </select>
                    </td>
                </tr>
                ${
                    enabledCategories.length > 0
                        ? `<tr>
                    <th><h4 class="fw-tablerow-title">${gettext("Category")}</h4></th>
                    <td>
                        <select class="code-block-category">
                            <option value="">${gettext("None")}</option>
                            ${enabledCategories
                                .map(
                                    cat =>
                                        `<option value="${cat}">${CATS[cat]?.[language] || cat}</option>`
                                )
                                .join("")}
                        </select>
                    </td>
                </tr>`
                        : ""
                }
                <tr>
                    <th><h4 class="fw-tablerow-title">${gettext("Title")}</h4></th>
                    <td>
                        <input type="text" class="code-block-title" placeholder="${gettext("Optional title")}" style="width: 80%">
                    </td>
                </tr>
            </tbody>
        </table>`
    }
}
