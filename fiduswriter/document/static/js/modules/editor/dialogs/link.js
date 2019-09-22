import {TextSelection} from "prosemirror-state"

import {linkDialogTemplate} from "./templates"

import {Dialog} from "../../common"

export class LinkDialog {
    constructor(editor) {
        this.editor = editor
        this.link = ''
        this.defaultLink = 'https://'
        this.linkTitle = ''
        this.submitButtonText = gettext('Insert')
        this.dialog = false
        this.internalTargets = []
    }

    init() {
        this.checkLink()
        this.findInternalTargets()
        this.createDialog()
    }

    findInternalTargets() {

        const docs = [this.editor.view.state.doc, this.editor.mod.footnotes.fnEditor.view.state.doc],
        figures = {}

        docs.forEach(doc => doc.descendants(node => {
            if (node.type.groups.includes('heading')) {
                this.internalTargets.push({
                    id: node.attrs.id,
                    text: node.textContent
                })
            }

            if (node.type.name === 'figure') {
                if (!figures[node.attrs.figureCategory]) {
                    figures[node.attrs.figureCategory] = 0
                }
                figures[node.attrs.figureCategory]++

                this.internalTargets.push({
                    id: node.attrs.id,
                    text: `${gettext(node.attrs.figureCategory)} ${figures[node.attrs.figureCategory]}: ${node.attrs.caption}`
                })
            }
        }))

    }

    // Check if there is an existing link at the selection. If this is the case
    // use its values in dialog.
    checkLink() {
        const state = this.editor.currentView.state,
            from = state.selection.from,
            linkMark = state.selection.$from.marks().find(
                mark => mark.type.name === 'link'
            )
        if (linkMark) {
            this.extendSelectionToMark(from, linkMark)
            this.submitButtonText = gettext('Update')
            this.linkTitle = linkMark.attrs.title ? linkMark.attrs.title : ''
            this.link = linkMark.attrs.href
        }
    }

    // Find the start and end of the link currently selected.
    extendSelectionToMark(pos, mark) {
        const view = this.editor.currentView,
            state = view.state,
            $pos = state.doc.resolve(pos)
        let startIndex = $pos.index(),
            endIndex = $pos.indexAfter()

        while (startIndex > 0 && mark.isInSet($pos.parent.child(startIndex - 1).marks)) {
            startIndex--
        }
        while (endIndex < $pos.parent.childCount && mark.isInSet($pos.parent.child(endIndex).marks)) {
            endIndex++
        }
        let startPos = $pos.start(),
            endPos = startPos

        for (let i = 0; i < endIndex; i++) {
            const size = $pos.parent.child(i).nodeSize
            if (i < startIndex) {
                startPos += size
            }
            endPos += size
        }
        view.dispatch(
            state.tr.setSelection(TextSelection.create(state.doc, startPos, endPos))
        )
    }

    createDialog() {
        const buttons = []
        buttons.push({
            text: this.submitButtonText,
            classes: 'fw-dark',
            click: () => {
                const linkTypeEl = this.dialog.dialogEl.querySelector('input[name=link-type]:checked'),
                    linkType = linkTypeEl ? linkTypeEl.value : 'external'
                let newLink = '', linkTitle = ''
                if (linkType === 'internal') {
                    const targetId = this.dialog.dialogEl.querySelector('select.internal-link-selector').value
                    if (targetId) {
                        newLink = `#${targetId}`
                        linkTitle = this.internalTargets.find(target => target.id === targetId).text
                    }
                } else {
                    newLink = this.dialog.dialogEl.querySelector('input.link').value
                    linkTitle = this.dialog.dialogEl.querySelector('input.link-title').value
                }

                if ((new RegExp(/^\s*$/)).test(newLink) || newLink === this.defaultLink) {
                    // The link input is empty or hasn't been changed from the default value.
                    // Just close the dialog.
                    this.dialog.close()
                    this.editor.currentView.focus()
                    return
                }

                if ((new RegExp(/^\s*$/)).test(linkTitle)) {
                    // The link title is empty. Make it the same as the link itself.
                    linkTitle = newLink
                }

                this.dialog.close()
                const view = this.editor.currentView,
                    posFrom = view.state.selection.from,
                    markType = view.state.schema.marks.link.create({
                        href: newLink,
                        title: linkTitle
                    })
                let posTo = view.state.selection.to
                // There is an empty selection. We insert the link title into the editor
                // and then add the link to that.
                if (posFrom===posTo) {
                    view.dispatch(view.state.tr.insertText(linkTitle, posFrom, posTo))
                    posTo = posFrom + linkTitle.length
                }
                view.dispatch(view.state.tr.addMark(
                    posFrom,
                    posTo,
                    markType
                ))
                view.focus()
                return
            }
        })

        buttons.push({
            type: 'cancel'
        })

        this.dialog = new Dialog({
            id: 'edit-link',
            title: gettext("Link"),
            body: linkDialogTemplate({
                linkTitle: this.linkTitle,
                link: this.link,
                defaultLink: this.defaultLink,
                internalTargets: this.internalTargets
            }),
            buttons,
            width: 836,
            height: 360,
            onClose: () => this.editor.currentView.focus()
        })

        this.dialog.open()

        if (this.internalTargets.length) {
            const externalEls = this.dialog.dialogEl.querySelectorAll('input.link, input.link-title'),
                internalEls = this.dialog.dialogEl.querySelectorAll('select.internal-link-selector'),
                externalSwitchers = this.dialog.dialogEl.querySelectorAll('input.link, input.link-title, label.link-external-label, input.link-external-check'),
                internalSwitchers = this.dialog.dialogEl.querySelectorAll('select.internal-link-selector, label.link-internal-label, input.link-internal-check'),
                radioInternal = this.dialog.dialogEl.querySelector('input.link-internal-check'),
                radioExternal = this.dialog.dialogEl.querySelector('input.link-external-check')

            if (this.link[0] === '#') {
                externalEls.forEach(el => el.classList.add("disabled"))
                radioInternal.checked = true
            } else {
                internalEls.forEach(el => el.classList.add("disabled"))
                radioExternal.checked = true
            }

            internalSwitchers.forEach(el => el.addEventListener('click', () => {
                externalEls.forEach(el => el.classList.add("disabled"))
                internalEls.forEach(el => el.classList.remove("disabled"))
                radioInternal.checked = true
            }))

            externalSwitchers.forEach(el => el.addEventListener('click', () => {
                internalEls.forEach(el => el.classList.add("disabled"))
                externalEls.forEach(el => el.classList.remove("disabled"))
                radioExternal.checked = true
            }))

        }
    }
}
