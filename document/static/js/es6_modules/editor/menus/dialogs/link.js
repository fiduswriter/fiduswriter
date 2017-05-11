import {InternalLinkDialogTemplate, linkDialogTemplate, InternalHeadingsTemplate} from "./templates"

export class LinkDialog {
    constructor(mod, internal, InternalHeadings) {

        this.editor = mod.editor
        this.internal = internal
        if (internal == 0) {
            this.link = 'http://'
            this.defaultLink = this.link
        } else {
            this.link = window.location.href
            this.defaultLink = this.link
            this.InternalHeadings = InternalHeadings
        }
        this.linkTitle = ''
        this.submitButtonText = gettext('Insert')
        this.dialog = false
    }

    init() {

        this.checkLink()
        this.createDialog()
    }

    // Check if there is an existing link at the selection. If this is the case
    // use its values in dialog.
    checkLink() {

        let linkElement = _.find(
            this.editor.currentPm.activeMarks(),
            mark => mark.type.name === 'link'
        )
        if (linkElement) {
            this.submitButtonText = gettext('Update')
            this.linkTitle = linkElement.attrs.title
            this.link = linkElement.attrs.href
        }
    }

    createDialog() {
        let buttons = []

        buttons.push({
            text: this.submitButtonText,
            class: 'fw-button fw-dark',
            click: () => {

                let heading = this.dialog.find('select').val(),
                    newLink = this.dialog.find('input.link').val() + '#' + heading,
                    linkTitle = this.dialog.find('input.linktitle').val()
                //TODO check if the heading before is not assigned, if it was the case
                // remove it and add the new one
                if ((new RegExp(/^\s*$/)).test(newLink) || newLink === this.defaultLink) {
                    // The link input is empty or hasn't been changed from the default value.
                    // Just close the dialog.
                    this.dialog.dialog('close')
                    this.editor.currentPm.focus()
                    return
                }

                if ((new RegExp(/^\s*$/)).test(linkTitle)) {
                    // The link title is empty. Make it the same as the link itself.
                    linkTitle = newLink
                }

                this.dialog.dialog('close')
                let pm = this.editor.currentPm
                if (!this.internal) {
                    let posFrom = pm.selection.from
                    let posTo = pm.selection.to
                    let markType = pm.schema.marks.link.create({
                        href: newLink,
                        title: linkTitle
                    })
                    pm.tr.addMark(
                        posFrom,
                        posTo,
                        markType
                    ).apply()
                    pm.focus()
                    return
                } else {

                    let posFrom = pm.selection.from,
                        posTo = posFrom + linkTitle.length
                    let markType = pm.schema.marks.internal_link.create({
                        id: this.dialog.find('select').val(),
                        href: newLink,
                        title: linkTitle
                    })

                    pm.tr.addMark(
                        posFrom,
                        posTo,
                        markType
                    ).apply()
                    pm.focus()
                    return
                }
            }
        })

        buttons.push({
            text: gettext('Cancel'),
            class: 'fw-button fw-orange',
            click: () => {
                this.dialog.dialog('close')
                this.editor.currentPm.focus()
            }
        })


        let temp = this.internal
        if (!temp) {

            this.dialog = jQuery(linkDialogTemplate({
                linkTitle: this.linkTitle,
                link: this.link
            }))
        } else {
            this.dialog = jQuery(InternalLinkDialogTemplate({
                linkTitle: this.linkTitle,
                link: this.link,
                array: this.InternalHeadings,
            }))




        }
        this.dialog.dialog({
            buttons,
            modal: true,
            close: () => {
                this.dialog.dialog('destroy').remove()
            }
        })
    }
}
