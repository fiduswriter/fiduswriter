import {linkDialogTemplate} from "./templates"

export class LinkDialog {
    constructor(mod) {
        this.editor = mod.editor
        this.link = 'http://'
        this.defaultLink = this.link
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

                let newLink = this.dialog.find('input.link').val(),
                    linkTitle = this.dialog.find('input.linktitle').val()

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
                //let mark = this.editor.currentPm.schema.marks['link']
                let pm = this.editor.currentPm
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

        this.dialog = jQuery(linkDialogTemplate({
            linkTitle: this.linkTitle,
            link: this.link
        }))

        this.dialog.dialog({
            buttons,
            modal: true,
            close: () => {
                this.dialog.dialog('destroy').remove()
            }
        })
    }
}
