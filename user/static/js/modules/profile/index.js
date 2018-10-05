import {addDropdownBox, whenReady, getUserInfo, activateWait, deactivateWait, post, addAlert, baseBodyTemplate, findTarget, setDocTitle} from "../common"
import {SiteMenu} from "../menu"
import {changeAvatarDialog, deleteAvatarDialog, changePwdDialog, addEmailDialog, changePrimaryEmailDialog, deleteEmailDialog} from "./dialogs"
import {profileContents} from "./templates"
import {DeleteUserDialog} from "./delete_user"
import {FeedbackTab} from "../feedback"

export class Profile {
    constructor({user, staticUrl}) {
        this.user = user
        this.staticUrl = staticUrl
    }

    init() {
        whenReady().then(() => {
            this.render()
            const smenu = new SiteMenu("") // Nothing highlighted
            smenu.init()
            addDropdownBox(document.getElementById('edit-avatar-btn'), document.getElementById('edit-avatar-pulldown'))
            document.querySelector('.change-avatar').addEventListener('mousedown', changeAvatarDialog)
            document.querySelector('.delete-avatar').addEventListener('mousedown', deleteAvatarDialog)
            document.getElementById('submit-profile').addEventListener('click', this.save)
            document.getElementById('delete-account').addEventListener('click', () => {
                const dialog = new DeleteUserDialog(document.getElementById('delete-account').dataset.username)
                dialog.init()
            })
            document.getElementById('fw-edit-profile-pwd').addEventListener('click',changePwdDialog)
            document.getElementById('add-profile-email').addEventListener('click', addEmailDialog)
            document.addEventListener('click', event => {
                const el = {}
                switch (true) {
                    case findTarget(event, '.delete-email', el):
                        deleteEmailDialog(el.target)
                        break
                    default:
                        break
                }
            })
            document.querySelectorAll('.primary-email-radio').forEach(el => el.addEventListener(
                'change', changePrimaryEmailDialog
            ))
        })
    }

    render() {
        document.body = document.createElement('body')
        document.body.innerHTML = baseBodyTemplate({
            contents: profileContents(this.user),
            username: this.user.username,
            staticUrl: this.staticUrl
        })
        setDocTitle(gettext('Configure profile'))
        const feedbackTab = new FeedbackTab({staticUrl: this.staticUrl})
        feedbackTab.init()
    }

    save() {
        activateWait()

        post(
            '/account/save/',
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
            () => deactivateWait()
        )

    }

}
