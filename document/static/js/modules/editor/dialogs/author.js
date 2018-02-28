import {authorTemplate} from "./templates"
import {authorsEndPos} from "../state_plugins"
import {addAlert} from "../../common"
/*
    Source for email regexp:
    https://html.spec.whatwg.org/multipage/input.html#e-mail-state-(type%3Demail)
*/
const emailRegExp = new RegExp(
    /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
)

export class AuthorDialog {
    constructor(editor, author = false) {
        this.editor = editor
        this.author = author
        this.dialog = false
    }

    init() {
        let buttons = []
        buttons.push({
            text: this.author ? gettext('Update') : gettext('Add'),
            class: 'fw-button fw-dark',
            click: () => {
                let firstname = this.dialog.find('input[name=firstname]').val(),
                    lastname = this.dialog.find('input[name=lastname]').val(),
                    email = this.dialog.find('input[name=email]').val(),
                    institution = this.dialog.find('input[name=institution]').val()

                firstname = firstname.length ? firstname : false
                lastname = lastname.length ? lastname : false
                institution = institution.length ? institution : false
                email = email.length ? email : false

                if (
                    email &&
                    !emailRegExp.test(email)
                ) {
                    addAlert('error', gettext('Email is in incorrect format!'))
                    return
                }

                this.dialog.dialog('close')

                if (!firstname && !lastname && !institution && !email) {
                    // No data, don't insert.
                    return
                }

                let view = this.editor.view,
                    node = view.state.schema.nodes.author.create({
                        firstname, lastname, email, institution
                    }), posFrom, posTo

                if (
                    this.author &&
                    view.state.selection.jsonID === 'node' &&
                    view.state.selection.node.type.name === 'author'
                ) {
                    posFrom = view.state.selection.from
                    posTo = view.state.selection.to
                } else {
                    posFrom = posTo = authorsEndPos(view.state)
                }

                view.dispatch(view.state.tr.replaceRangeWith(
                    posFrom,
                    posTo,
                    node
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

        this.dialog = jQuery(authorTemplate({
            author: this.author ? this.author : {},
            isNew: this.author ? false : true
        }))

        this.dialog.dialog({
            draggable: false,
            resizable: false,
            top: 10,
            width: 836,
            height: 360,
            modal: true,
            buttons,
            close: () => {
                this.dialog.dialog('destroy').remove()
                this.editor.currentView.focus()
            }
        })

    }
}
