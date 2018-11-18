import {contributorTemplate} from "./templates"
import {contributorsEndPos} from "../state_plugins"
import {addAlert, Dialog} from "../../common"
/*
    Source for email regexp:
    https://html.spec.whatwg.org/multipage/input.html#e-mail-state-(type%3Demail)
*/
const emailRegExp = new RegExp(
    /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
)

export class ContributorDialog {
    constructor(node, view, contributor = false) {
        this.node = node
        this.view = view
        this.contributor = contributor
        this.dialog = false
    }

    init() {
        const buttons = []
        buttons.push({
            text: this.contributor ? gettext('Update') : gettext('Add'),
            classes: 'fw-dark',
            click: () => {
                let firstname = this.dialog.dialogEl.querySelector('input[name=firstname]').value,
                    lastname = this.dialog.dialogEl.querySelector('input[name=lastname]').value,
                    email = this.dialog.dialogEl.querySelector('input[name=email]').value,
                    institution = this.dialog.dialogEl.querySelector('input[name=institution]').value

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

                this.dialog.close()

                if (!firstname && !lastname && !institution && !email) {
                    // No data, don't insert.
                    return
                }

                const view = this.view,
                    node = view.state.schema.nodes.contributor.create({
                        firstname, lastname, email, institution
                    })
                let posFrom, posTo

                if (
                    this.contributor &&
                    view.state.selection.jsonID === 'node' &&
                    view.state.selection.node.type.name === 'contributor'
                ) {
                    posFrom = view.state.selection.from
                    posTo = view.state.selection.to
                } else {
                    view.state.doc.firstChild.forEach((partElement, offset) => {
                        if (partElement===this.node) {
                            posFrom = posTo = offset + partElement.nodeSize
                            // +1 to enter article -1 to go to end of node contributors container node
                        }
                    })
                }

                view.dispatch(view.state.tr.replaceRangeWith(
                    posFrom,
                    posTo,
                    node
                ))
                return
            }
        })

        buttons.push({
            type: 'cancel'
        })

        this.dialog = new Dialog({
            id: 'edit-contributor',
            title: `${this.contributor ? gettext('Update') : gettext('Add')} ${this.node.type.spec.item_title.toLowerCase()}`,
            body: contributorTemplate({
                contributor: this.contributor ? this.contributor : {},
            }),
            width: 836,
            height: 360,
            buttons,
            onClose: () => this.view.focus()
        })

        this.dialog.open()

    }
}
