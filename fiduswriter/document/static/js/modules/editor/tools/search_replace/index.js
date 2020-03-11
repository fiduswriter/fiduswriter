import {Dialog} from "../../../common"
import {
    endSearch,
    setSearchTerm,
    getSearchMatches,
    selectPreviousSearchMatch,
    selectNextSearchMatch,
    deselectSearchMatch
}
from "../../state_plugins"
import {
    searchDialogTemplate
}
from "./templates"
import {
    READ_ONLY_ROLES,
    COMMENT_ONLY_ROLES
}
from "../.."

export class SearchReplaceDialog {
    constructor(editor) {
        this.editor = editor
        this.dialog = false
        this.matches = {matches: [], selected: false}
        this.fnMatches = {matches: [], selected: false}
        this.canWrite = READ_ONLY_ROLES.includes(this.editor.docInfo.access_rights) || COMMENT_ONLY_ROLES.includes(this.editor.docInfo.access_rights) ? false : true
    }

    init() {
        let buttons = [
            {
                text: gettext('Previous'),
                classes: 'fw-light disabled',
                click: () => {
                    if (this.matches.selected !== false) {
                        if (this.matches.selected > 0 || !this.fnMatches.matches.length) {
                            this.editor.view.dispatch(
                                selectPreviousSearchMatch(this.editor.view.state)
                            )
                        } else {
                            this.editor.view.dispatch(
                                deselectSearchMatch(this.editor.view.state)
                            )
                            this.editor.mod.footnotes.fnEditor.view.dispatch(
                                selectPreviousSearchMatch(this.editor.mod.footnotes.fnEditor.view.state)
                            )
                        }
                    } else if (this.fnMatches.selected !== false) {
                        if (this.fnMatches.selected > 0 || !this.matches.matches.length) {
                            this.editor.mod.footnotes.fnEditor.view.dispatch(
                                selectPreviousSearchMatch(this.editor.mod.footnotes.fnEditor.view.state)
                            )
                        } else {
                            this.editor.mod.footnotes.fnEditor.view.dispatch(
                                deselectSearchMatch(this.editor.mod.footnotes.fnEditor.view.state)
                            )
                            this.editor.view.dispatch(
                                selectPreviousSearchMatch(this.editor.view.state)
                            )
                        }
                    }
                }
            },
            {
                text: gettext('Next'),
                classes: 'fw-light disabled',
                click: () => {
                    if (this.matches.selected !== false) {
                        if (this.matches.selected < this.matches.matches.length - 1 || !this.fnMatches.matches.length) {
                            this.editor.view.dispatch(
                                selectNextSearchMatch(this.editor.view.state)
                            )
                        } else {
                            this.editor.view.dispatch(
                                deselectSearchMatch(this.editor.view.state)
                            )
                            this.editor.mod.footnotes.fnEditor.view.dispatch(
                                selectNextSearchMatch(this.editor.mod.footnotes.fnEditor.view.state)
                            )
                        }
                    } else if (this.fnMatches.selected !== false) {
                        if (this.fnMatches.selected < this.fnMatches.matches.length - 1 || !this.matches.matches.length) {
                            this.editor.mod.footnotes.fnEditor.view.dispatch(
                                selectNextSearchMatch(this.editor.mod.footnotes.fnEditor.view.state)
                            )
                        } else {
                            this.editor.mod.footnotes.fnEditor.view.dispatch(
                                deselectSearchMatch(this.editor.mod.footnotes.fnEditor.view.state)
                            )
                            this.editor.view.dispatch(
                                selectNextSearchMatch(this.editor.view.state)
                            )
                        }
                    }
                }
            }
        ]

        if (this.canWrite) {
            buttons = buttons.concat([
                {
                    text: gettext('Replace'),
                    classes: 'fw-dark disabled',
                    click: () => {
                        if (this.matches.selected !== false) {
                            const match = this.matches.matches[this.matches.selected]
                            const tr = this.editor.view.state.tr.insertText(this.replaceInput.value, match.from, match.to)
                            this.editor.view.dispatch(tr)
                        } else if (this.fnMatches.selected !== false) {
                            const match = this.fnMatches.matches[this.fnMatches.selected]
                            const tr = this.editor.mod.footnotes.fnEditor.view.state.tr.insertText(this.replaceInput.value, match.from, match.to)
                            this.editor.mod.footnotes.fnEditor.view.dispatch(tr)
                        }
                    }
                },
                {
                    text: gettext('Replace All'),
                    classes: 'fw-dark disabled',
                    click: () => {
                        if (this.matches.matches.length) {
                            const tr = this.editor.view.state.tr
                            const matches = this.matches.matches.slice()
                            while (matches.length) {
                                const match = matches.pop() // We take them backward so that there is no need for mapping steps
                                tr.insertText(this.replaceInput.value, match.from, match.to)
                            }
                            this.editor.view.dispatch(tr)
                        }
                        if (this.fnMatches.matches.length) {
                            const tr = this.editor.mod.footnotes.fnEditor.view.state.tr
                            const matches = this.fnMatches.matches.slice()
                            while (matches.length) {
                                const match = matches.pop() // We take them backward so that there is no need for mapping steps
                                tr.insertText(this.replaceInput.value, match.from, match.to)
                            }
                            this.editor.mod.footnotes.fnEditor.view.dispatch(tr)
                        }
                    }
                }
            ])
        }



        this.dialog = new Dialog({
            title: this.canWrite ? gettext('Search and replace') : gettext('Search'),
            body: searchDialogTemplate({canWrite: this.canWrite}),
            buttons,
            onClose: () => {
                this.endSearch()
                this.editor.currentView.focus()
            },
            canEscape: true
        })

        this.dialog.open()

        this.searchInput = this.dialog.dialogEl.querySelector('.search')
        this.replaceInput = this.dialog.dialogEl.querySelector('.replace')
        this.dialog.dialogEl.querySelector('input[type=text]').focus()

        this.bind()
    }

    setButtonState() {
        if (this.matches.matches.length + this.fnMatches.matches.length > 1) {
            this.dialog.buttons[0].classes = 'fw-light'
            this.dialog.buttons[1].classes = 'fw-light'
        } else {
            this.dialog.buttons[0].classes = 'fw-light disabled'
            this.dialog.buttons[1].classes = 'fw-light disabled'
        }
        if (this.canWrite) {
            if (this.matches.matches.length || this.fnMatches.matches.length) {
                this.dialog.buttons[2].classes = 'fw-dark'
                this.dialog.buttons[3].classes = 'fw-dark'
            } else {
                this.dialog.buttons[2].classes = 'fw-dark disabled'
                this.dialog.buttons[3].classes = 'fw-dark disabled'
            }
        }


        this.dialog.refreshButtons()
    }

    bind() {
        this.searchInput.addEventListener('input', () => {
            this.search(this.searchInput.value)
        })
        if (this.canWrite) {
            this.replaceInput.addEventListener('input', () => {
                this.setButtonState()
            })
        }
    }

    onUpdate() {
        this.matches = getSearchMatches(this.editor.view.state)
        this.fnMatches = getSearchMatches(this.editor.mod.footnotes.fnEditor.view.state)
        const selectedSearch = document.querySelector('#paper-editable .search.selected')

        if (selectedSearch) {
            selectedSearch.scrollIntoView(false)
        }
        // listener for change in views
        this.setButtonState()
    }

    search(term) {
        const setSearchTermResult = setSearchTerm(
            this.editor.view.state,
            term,
            this.editor.view === this.editor.currentView ? 0 : false,
            this
        )
        let {tr} = setSearchTermResult
        const {matches, selected} = setSearchTermResult
        const setSearchTermResultFn = setSearchTerm(
            this.editor.mod.footnotes.fnEditor.view.state,
            term,
            this.editor.mod.footnotes.fnEditor.view === this.editor.currentView ? 0 : false
        )
        let {tr: fnTr} = setSearchTermResultFn
        const {matches: fnMatches, selected: fnSelected} = setSearchTermResultFn
        if (selected === false && fnSelected === false && (matches.length || fnMatches.length)) {
            if (matches.length) {
                tr = setSearchTerm(this.editor.view.state, term, 0, this).tr
            } else {
                fnTr = setSearchTerm(this.editor.mod.footnotes.fnEditor.view.state, term, 0).tr
            }
        }
        this.editor.mod.footnotes.fnEditor.view.dispatch(fnTr)
        this.editor.view.dispatch(tr)
    }

    endSearch() {
        this.editor.view.dispatch(
            endSearch(this.editor.view.state)
        )
        this.editor.mod.footnotes.fnEditor.view.dispatch(
            endSearch(this.editor.mod.footnotes.fnEditor.view.state)
        )
    }

}
