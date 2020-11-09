import {addAlert, postJson, Dialog} from "../common"


export class DocTemplatesActions {

    constructor(docTemplatesOverview) {
        docTemplatesOverview.mod.actions = this
        this.docTemplatesOverview = docTemplatesOverview
    }

    deleteDocTemplate(id) {
        const docTemplate = this.docTemplatesOverview.templateList.find(
            docTemplate => docTemplate.id === id
        )
        if (!docTemplate) {
            return
        }

        postJson(
            '/api/user_template_manager/delete/',
            {id}
        ).catch(
            error => {
                addAlert('error', `${gettext('Could not delete document template')}: '${docTemplate.title}'`)
                throw (error)
            }
        ).then(({json}) => {
            if (json.done) {
                addAlert('success', `${gettext('Document template successfully deleted')}: '${docTemplate.title}'`)
                this.docTemplatesOverview.removeTableRows([id])
                this.docTemplatesOverview.templateList = this.docTemplatesOverview.templateList.filter(
                    docTemplate => docTemplate.id !== id
                )
            } else {
                addAlert('error', `${gettext('Document template still required by documents')}: '${docTemplate.title}'`)
            }
        })

    }

    deleteDocTemplatesDialog(ids) {
        const buttons = [
            {
                text: gettext('Delete'),
                classes: "fw-dark",
                click: () => {
                    ids.forEach(id => this.deleteDocTemplate(parseInt(id)))
                    dialog.close()
                }
            },
            {
                type: 'close'
            }
        ]

        const dialog = new Dialog({
            title: gettext('Confirm deletion'),
            id: 'confirmdeletion',
            icon: 'exclamation-triangle',
            body: `<p>${ids.length > 1 ? gettext('Delete the document templates?') : gettext('Delete the document template?')}</p>`,
            buttons
        })
        dialog.open()
    }

    copyDocTemplate(oldDocTemplate) {
        return postJson(
            '/api/user_template_manager/copy/',
            {id: oldDocTemplate.id}
        ).catch(
            error => {
                addAlert('error', gettext('The document template could not be copied'))
                throw (error)
            }
        ).then(
            ({json}) => {
                const docTemplate = JSON.parse(JSON.stringify(oldDocTemplate))
                docTemplate.is_owner = true
                docTemplate.id = json['new_id']
                this.docTemplatesOverview.templateList.push(docTemplate)
                this.docTemplatesOverview.addDocTemplateToTable(docTemplate)
            }
        )
    }
}
