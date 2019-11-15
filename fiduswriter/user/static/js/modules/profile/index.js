import {addDropdownBox, whenReady, activateWait, deactivateWait, post, addAlert, baseBodyTemplate, findTarget, setDocTitle, ensureCSS} from "../common"
import {SiteMenu} from "../menu"
import {changeAvatarDialog, deleteAvatarDialog, changePwdDialog, addEmailDialog, changePrimaryEmailDialog, deleteEmailDialog} from "./dialogs"
import {profileContents} from "./templates"
import {DeleteUserDialog} from "./delete_user"
import {FeedbackTab} from "../feedback"

export class Profile {
    constructor({app, user, staticUrl}) {
        this.app = app
        this.user = user
        this.staticUrl = staticUrl
    }

    init() {
        return whenReady().then(() => {
            this.render()
            const smenu = new SiteMenu("") // Nothing highlighted
            smenu.init()
            addDropdownBox(
                this.dom.querySelector('#edit-avatar-btn'),
                this.dom.querySelector('#edit-avatar-pulldown')
            )
            this.dom.addEventListener('click', event => {
                const el = {}
                let dialog
                switch (true) {
                    case findTarget(event, '#add-profile-email', el):
                        addEmailDialog(this.app)
                        break
                    case findTarget(event, '#fw-edit-profile-pwd', el):
                        changePwdDialog({username: this.user.username})
                        break
                    case findTarget(event, '#delete-account', el):
                        dialog = new DeleteUserDialog(
                            this.dom.querySelector('#delete-account').dataset.username
                        )
                        dialog.init()
                        break
                    case findTarget(event, '#submit-profile', el):
                        this.save()
                        break
                    case findTarget(event, '.delete-email', el):
                        deleteEmailDialog(el.target, this.app)
                        break
                    case findTarget(event, '.change-avatar', el):
                        changeAvatarDialog(this.app)
                        break
                    case findTarget(event, '.delete-avatar', el):
                        deleteAvatarDialog(this.app)
                        break
                    default:
                        break
                }
            })
            this.dom.querySelectorAll('.primary-email-radio').forEach(el => el.addEventListener(
                'change', () => changePrimaryEmailDialog(this.app)
            ))
        })
    }

    render() {
        this.dom = document.createElement('body')
        this.dom.innerHTML = baseBodyTemplate({
            contents: profileContents(this.user),
            user: this.user,
            staticUrl: this.staticUrl
        })
        document.body = this.dom

        ensureCSS([
            'show_profile.css'
        ], this.staticUrl)

        setDocTitle(gettext('Configure profile'), this.app)
        const feedbackTab = new FeedbackTab({staticUrl: this.staticUrl})
        feedbackTab.init()
    }

    save() {
        activateWait()

        return post(
            '/api/user/save/',
            {
                form_data: JSON.stringify({
                    user: {
                        username: this.dom.querySelector('#username').value,
                        first_name: this.dom.querySelector('#first_name').value,
                        last_name: this.dom.querySelector('#last_name').value
                    }
                })
            }
        ).catch(
            () => addAlert('error', gettext('Could not save profile data'))
        ).then(
            () => {
                deactivateWait()
                return this.app.getUserInfo()
            }
        ).then(
            () => this.app.selectPage()
        )

    }

}
