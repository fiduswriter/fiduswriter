import {escapeText, findTarget} from "../../common"
export class ModNavigator {
    constructor(editor) {
        editor.mod.navigator = this
        this.editor = editor
        this.navigatorEl = document.querySelector("#navigator")
        this.listeners = {}
        this.navigatorFilters = editor.menu.navigatorFilterModel.content
        this.defaultFilters = ["heading1", "heading2", "heading3"]
    }

    init() {
        this.render()
        this.bindEvents()
    }

    render() {
        this.navigatorEl.innerHTML = this.getNavigatorTemplate()
    }

    bindEvents() {
        document.body.addEventListener("click", event => {
            const el = {}
            switch (true) {
                case findTarget(event, "#navigator-button", el):
                    if (this.navigatorEl.classList.contains("opened")) {
                        this.closeNavigator()
                    } else {
                        const navigatorListEl =
                            document.getElementById("navigator-list")
                        if (navigatorListEl) {
                            navigatorListEl.innerHTML =
                                this.populateNavigator() || "" //Populating the list
                        }
                        this.openNavigator()
                    }
                    break
                case findTarget(event, "#navigator-list a", el): {
                    event.preventDefault()
                    event.stopImmediatePropagation()
                    const target = el.target.getAttribute("href").slice(1)
                    if (target == "bibliography") {
                        this.editor.scrollBibliographyIntoView(target)
                    } else {
                        this.editor.scrollIdIntoView(target)
                        this.switchActiveHeading(el.target.parentNode)
                    }
                    break
                }
                case findTarget(event, "#navigator-filter-icon", el): {
                    const navigatorFilterEl =
                        document.getElementById("navigator-filter")
                    if (navigatorFilterEl?.classList.contains("hide")) {
                        this.showFilters()
                    } else {
                        this.hideFilters()
                    }
                    break
                }
                case findTarget(event, "#navigator-filter-back", el): {
                    this.defaultFilters = []
                    document
                        .querySelectorAll("#navigator-filter input")
                        .forEach(item => {
                            if (item.checked) {
                                this.defaultFilters.push(item.id)
                            }
                        })
                    const navigatorListEl =
                        document.getElementById("navigator-list")
                    if (navigatorListEl) {
                        navigatorListEl.innerHTML =
                            this.populateNavigator() || ""
                    }
                    this.hideFilters()
                    break
                }
                case findTarget(event, "input", el):
                    break
                case findTarget(event, "label", el):
                    break
                default:
                    this.closeNavigator()
                    break
            }
        })

        document.body
            .querySelector("#navigator-list")
            .addEventListener("mouseover", () => {
                document.body.classList.add("no-scroll")
            })
        document.body
            .querySelector("#navigator-list")
            .addEventListener("mouseout", () => {
                document.body.classList.remove("no-scroll")
            })
    }

    switchActiveHeading(new_heading) {
        Array.prototype.forEach.call(
            document.querySelectorAll("#navigator-list .active-heading"),
            active_heading => active_heading.classList.remove("active-heading")
        )
        new_heading.classList.add("active-heading")
    }

    openNavigator() {
        const navigatorEl = document.getElementById("navigator")
        const navigatorFilterEl = document.getElementById("navigator-filter")
        const navigatorListEl = document.getElementById("navigator-list")
        const navigatorFilterBackEl = document.getElementById(
            "navigator-filter-back"
        )
        const navigatorFilterIconEl = document.getElementById(
            "navigator-filter-icon"
        )
        if (
            !navigatorEl ||
            !navigatorFilterEl ||
            !navigatorListEl ||
            !navigatorFilterBackEl ||
            !navigatorFilterIconEl
        ) {
            return
        }
        navigatorEl.classList.add("opened")
        navigatorFilterEl.classList.add("hide")
        navigatorListEl.classList.remove("hide")
        navigatorFilterBackEl.classList.add("hide")
        navigatorFilterIconEl.classList.remove("hide")
        this.scrollToActiveHeading()
    }

    scrollToActiveHeading() {
        const listEl = document.getElementById("navigator-list")
        const activeHeading = listEl?.querySelector(".active-heading")
        if (activeHeading) {
            activeHeading.scrollIntoView()
        }
    }

    closeNavigator() {
        const navigatorEl = document.getElementById("navigator")
        if (navigatorEl) {
            navigatorEl.classList.remove("opened")
        }
    }

    showFilters() {
        const navigatorFilterEl = document.getElementById("navigator-filter")
        const navigatorListEl = document.getElementById("navigator-list")
        const navigatorFilterBackEl = document.getElementById(
            "navigator-filter-back"
        )
        const navigatorFilterIconEl = document.getElementById(
            "navigator-filter-icon"
        )
        if (
            !navigatorFilterEl ||
            !navigatorFilterBackEl ||
            !navigatorListEl ||
            !navigatorFilterIconEl
        ) {
            return
        }
        navigatorFilterEl.classList.remove("hide")
        navigatorFilterBackEl.classList.remove("hide")
        navigatorListEl.classList.add("hide")
        navigatorFilterIconEl.classList.add("hide")
        //populating the filter list
        navigatorFilterEl.innerHTML = this.populateNavFilter()
    }

    hideFilters() {
        const navigatorFilterEl = document.getElementById("navigator-filter")
        const navigatorListEl = document.getElementById("navigator-list")
        const navigatorFilterBackEl = document.getElementById(
            "navigator-filter-back"
        )
        const navigatorFilterIconEl = document.getElementById(
            "navigator-filter-icon"
        )
        if (
            !navigatorFilterEl ||
            !navigatorFilterBackEl ||
            !navigatorListEl ||
            !navigatorFilterIconEl
        ) {
            return
        }
        navigatorFilterEl.classList.add("hide")
        navigatorFilterBackEl.classList.add("hide")
        navigatorListEl.classList.remove("hide")
        navigatorFilterIconEl.classList.remove("hide")

        this.scrollToActiveHeading()
    }

    populateNavigator() {
        const currentPos = this.editor.view.state.selection.$head.pos
        const items = []
        let nearestHeader = ""
        this.editor.view.state.doc.descendants((node, pos) => {
            if (node.attrs?.hidden) {
                return false
            } else if (
                this.defaultFilters.includes(node.type.name) &&
                node.textContent !== ""
            ) {
                if (pos <= currentPos) {
                    nearestHeader = node
                } else if (nearestHeader !== "") {
                    items[items.length - 1] = Object.assign(
                        {},
                        items[items.length - 1],
                        {
                            class: "active-heading"
                        }
                    )
                    nearestHeader = ""
                }
                items.push({
                    id: node.attrs.id,
                    textContent: node.textContent,
                    type: node.type
                })
            }
        })
        const bibHeader = document.querySelector("h1.doc-bibliography-header")
        if (bibHeader) {
            items.push({
                id: "bibliography",
                textContent: bibHeader.innerText,
                type: {name: "h1"}
            })
        }
        if (items.length) {
            return this.navigatorHTML(items)
        } else {
            return false
        }
    }

    populateNavFilter() {
        return this.navigatorFilters
            .map(item => {
                const level = item.level
                return `<span><input type="checkbox" class="form-checkbox" id="heading${level}" ${this.inDefault(level)} />
                                <label class="navigator-label" for="heading${level}">${item.title}</label>
                            </span>`
            })
            .join("")
    }

    inDefault(level) {
        if (this.defaultFilters.includes("heading" + level)) {
            return "checked"
        } else {
            return ""
        }
    }

    navigatorHTML(items) {
        return `
        ${items
            .map(item => {
                const level = item.type.name.substr(-1)
                if (item.class) {
                    return `<h${level} class="${item.class}"><a href="#${item.id}">${escapeText(item.textContent)}</a></h${level}>`
                } else {
                    return `<h${level}><a href="#${item.id}">${escapeText(item.textContent)}</a></h${level}>`
                }
            })
            .join("")}`
    }

    getNavigatorTemplate() {
        return `
                <div id="navigator-content">
                    <div class="header-container">
                        <span id="navigator-filter-back" class="hide"><i class="fas fa-arrow-left"></i></span>
                        <h1 class="header">${gettext("Document Navigator")}</h1>
                        <span id="navigator-filter-icon"><i class="fas fa-cog"></i></span>
                    </div>
                    <div id="navigator-list"></div>
                    <div id="navigator-filter" class="hide">
                    </div>
                </div>
                <div id="navigator-button">
                    <span class="navigator-arrow-icon"><i class="fas fa-scroll"></i></span>
                </div>
                `
    }
}
