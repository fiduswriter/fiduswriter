import {DOMSerializer} from "prosemirror-model"
import {NodeSelection, Plugin, PluginKey} from "prosemirror-state"
import {ContentMenu} from "../../common"

const key = new PluginKey("codeBlockMenu")

class CodeBlockView {
    constructor(node, view, getPos, options) {
        this.node = node
        this.view = view
        this.getPos = getPos
        this.options = options
        this.dom = document.createElement("div")
        this.dom.classList.add("code-block-wrapper")

        // Add category label and title if present
        if (this.node.attrs.category || this.node.attrs.title) {
            this.addLabel()
        }

        // Use DOMSerializer to create the content
        this.serializer = DOMSerializer.fromSchema(node.type.schema)
        const preElement = this.serializer.serializeNode(this.node)
        preElement.classList.forEach(className =>
            this.dom.classList.add(className)
        )
        preElement.classList.value = ""
        this.dom.appendChild(preElement)

        // The contentDOM should be the <code> element inside <pre>
        this.contentDOM = preElement.querySelector("code")

        // Add menu button
        this.menuButton = document.createElement("button")
        this.menuButton.classList.add("code-block-menu-btn")
        this.menuButton.innerHTML =
            '<span class="dot-menu-icon"><i class="fa fa-ellipsis-v"></i></span>'
        this.dom.insertBefore(this.menuButton, this.dom.firstChild)

        // Add language badge if language is set
        if (this.node.attrs.language) {
            this.addLanguageBadge()
        }
    }

    addLabel() {
        const {category, title, id} = this.node.attrs
        const language = this.view.state.doc.attrs.language
        const categories = {}

        // Count code blocks by category
        this.view.state.doc.descendants(node => {
            if (node.attrs.track?.find(track => track.type === "deletion")) {
                return true
            }
            if (
                node.type.name === "code_block" &&
                node.attrs.category &&
                node.attrs.id
            ) {
                if (!categories[node.attrs.category]) {
                    categories[node.attrs.category] = 0
                }
                categories[node.attrs.category]++

                if (node.attrs.id === id) {
                    // Found our position, stop counting
                    return false
                }
            }
        })

        const label = document.createElement("div")
        label.classList.add("code-block-label")

        if (category && id) {
            label.dataset.id = id
            const {CATS} = require("../../schema/i18n")
            const categoryLabel = CATS[category]?.[language] || category
            const number = categories[category] || 1

            const labelText = title
                ? `${categoryLabel} ${number}: ${title}`
                : `${categoryLabel} ${number}`

            label.innerHTML = `<span class="label-text">${labelText}</span>`
        } else if (title) {
            // Title without category
            label.innerHTML = `<span class="label-text">${title}</span>`
        }

        this.dom.appendChild(label)
    }

    addLanguageBadge() {
        const badge = document.createElement("div")
        badge.classList.add("code-block-language-badge")
        badge.textContent = this.node.attrs.language
        this.dom.appendChild(badge)
    }

    stopEvent(event) {
        let stopped = false
        if (event.type === "mousedown") {
            const composedPath = event.composedPath()
            if (composedPath.includes(this.menuButton)) {
                stopped = true
                const tr = this.view.state.tr
                const $pos = this.view.state.doc.resolve(this.getPos())
                tr.setSelection(new NodeSelection($pos))
                this.view.dispatch(tr)
                const contentMenu = new ContentMenu({
                    menu: this.options.editor.menu.codeBlockMenuModel,
                    width: 280,
                    page: this.options.editor,
                    menuPos: {
                        X: Number.parseInt(event.pageX) + 20,
                        Y: Number.parseInt(event.pageY) - 100
                    },
                    onClose: () => {
                        this.view.focus()
                    }
                })
                contentMenu.open()
            } else if (
                composedPath.includes(this.dom) &&
                !composedPath.find(el => el.matches && el.matches("code"))
            ) {
                stopped = true
                const tr = this.view.state.tr
                const $pos = this.view.state.doc.resolve(this.getPos())
                tr.setSelection(new NodeSelection($pos))
                this.view.dispatch(tr)
            }
        }

        return stopped
    }

    update(node) {
        if (node.type !== this.node.type) {
            return false
        }

        const oldNode = this.node
        this.node = node

        // Update language badge if changed
        if (node.attrs.language !== oldNode.attrs.language) {
            const existingBadge = this.dom.querySelector(
                ".code-block-language-badge"
            )
            if (existingBadge) {
                existingBadge.remove()
            }
            if (node.attrs.language) {
                this.addLanguageBadge()
            }
        }

        // Update label if category, title, or id changed
        if (
            node.attrs.category !== oldNode.attrs.category ||
            node.attrs.title !== oldNode.attrs.title ||
            node.attrs.id !== oldNode.attrs.id
        ) {
            const existingLabel = this.dom.querySelector(".code-block-label")
            if (existingLabel) {
                existingLabel.remove()
            }
            if (node.attrs.category || node.attrs.title) {
                this.addLabel()
            }
        }

        return true
    }
}

export const codeBlockPlugin = options =>
    new Plugin({
        key,
        state: {
            init(_config, _state) {
                if (options.editor.docInfo.access_rights === "write") {
                    this.spec.props.nodeViews["code_block"] = (
                        node,
                        view,
                        getPos
                    ) => new CodeBlockView(node, view, getPos, options)
                }
                return {}
            },
            apply(_tr, prev) {
                return prev
            }
        },
        props: {
            nodeViews: {}
        }
    })
