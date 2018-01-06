import {TextSelection} from "prosemirror-state"
import {InternalLinkDialogTemplate, linkDialogTemplate, InternalHeadingsTemplate} from "./templates"

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

        let docs = [this.editor.view.state.doc, this.editor.mod.footnotes.fnEditor.view.state.doc],
        figures = {}

        docs.forEach(doc => doc.descendants(node => {
            if (node.type.name === 'heading') {
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
        let state = this.editor.currentView.state,
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
        let view = this.editor.currentView,
            state = view.state,
            $pos = state.doc.resolve(pos),
            startIndex = $pos.index(),
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
            let size = $pos.parent.child(i).nodeSize
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
        let buttons = []
        buttons.push({
            text: this.submitButtonText,
            class: 'fw-button fw-dark',
            click: () => {
                let linkType = this.dialog.find('input[name=link-type]:checked').val(),
                    newLink = '', linkTitle = ''
                if (linkType === 'internal') {
                    let targetId = this.dialog.find('select.internal-link-selector').val()
                    if (targetId) {
                        newLink = `#${targetId}`
                        linkTitle = this.internalTargets.find(target => target.id === targetId).text
                    }
                } else {
                    newLink = this.dialog.find('input.link').val()
                    linkTitle = this.dialog.find('input.link-title').val()
                }

                if ((new RegExp(/^\s*$/)).test(newLink) || newLink === this.defaultLink) {
                    // The link input is empty or hasn't been changed from the default value.
                    // Just close the dialog.
                    this.dialog.dialog('close')
                    this.editor.currentView.focus()
                    return
                }

                if ((new RegExp(/^\s*$/)).test(linkTitle)) {
                    // The link title is empty. Make it the same as the link itself.
                    linkTitle = newLink
                }

                this.dialog.dialog('close')
                let view = this.editor.currentView,
                    posFrom = view.state.selection.from,
                    posTo = view.state.selection.to,
                    markType = view.state.schema.marks.link.create({
                        href: newLink,
                        title: linkTitle
                    })
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
            text: gettext('Cancel'),
            class: 'fw-button fw-orange',
            click: () => {
                this.dialog.dialog('close')
                this.editor.currentView.focus()
            }
        })

        this.dialog = jQuery(linkDialogTemplate({
            linkTitle: this.linkTitle,
            link: this.link,
            defaultLink: this.defaultLink,
            internalTargets: this.internalTargets
        }))

        this.dialog.dialog({
            draggable: false,
            resizable: false,
            top: 10,
            width: 836,
            height: 360,
            modal: true,
            buttons,
            close: () => this.dialog.dialog('destroy').remove()
        })

        if (this.internalTargets.length) {
            let externalEls = this.dialog.find('input.link, input.link-title'),
                internalEls = this.dialog.find('select.internal-link-selector'),
                externalSwitchers = this.dialog.find('input.link, input.link-title, label.link-external-label, input.link-external-check'),
                internalSwitchers = this.dialog.find('select.internal-link-selector, label.link-internal-label, input.link-internal-check'),
                radioInternal = this.dialog.find('input.link-internal-check'),
                radioExternal = this.dialog.find('input.link-external-check')

            if (this.link[0] === '#') {
                externalEls.addClass("disabled")
                radioInternal.prop("checked", true)
            } else {
                internalEls.addClass("disabled")
                radioExternal.prop("checked", true)
            }

            internalSwitchers.on('mousedown', () => {
                externalEls.addClass("disabled")
                internalEls.removeClass("disabled")
                radioInternal.prop("checked", true)
            })

            externalSwitchers.on('mousedown', () => {
                internalEls.addClass("disabled")
                externalEls.removeClass("disabled")
                radioExternal.prop("checked", true)
            })

        }
    }
}
