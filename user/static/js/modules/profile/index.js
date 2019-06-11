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
        whenReady().then(() => {
            this.render()
            const smenu = new SiteMenu("") // Nothing highlighted
            smenu.init()
            addDropdownBox(document.getElementById('edit-avatar-btn'), document.getElementById('edit-avatar-pulldown'))
            document.body.addEventListener('click', event => {
                const el = {}
                let dialog
                switch (true) {
                    case findTarget(event, '#add-profile-email', el):
                        addEmailDialog()
                        break
                    case findTarget(event, '#fw-edit-profile-pwd', el):
                        changePwdDialog()
                        break
                    case findTarget(event, '#delete-account', el):
                        dialog = new DeleteUserDialog(document.getElementById('delete-account').dataset.username)
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
            document.querySelectorAll('.primary-email-radio').forEach(el => el.addEventListener(
                'change', () => changePrimaryEmailDialog(this.app)
            ))
        })
    }

    render() {
        document.body = document.createElement('body')
        document.body.innerHTML = baseBodyTemplate({
            contents: profileContents(this.user),
            user: this.user,
            staticUrl: this.staticUrl
        })

        ensureCSS([
            'show_profile.css'
        ], this.staticUrl)

        setDocTitle(gettext('Configure profile'), this.app)
        const feedbackTab = new FeedbackTab({staticUrl: this.staticUrl})
        feedbackTab.init()
    }

    save() {
        activateWait()

        post(
            '/api/user/save/',
            {
                form_data: JSON.stringify({
                    user: {
                        username: document.getElementById('username').value,
                        first_name: document.getElementById('first_name').value,
                        last_name: document.getElementById('last_name').value
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
