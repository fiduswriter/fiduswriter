import {Plugin, PluginKey} from "prosemirror-state"
import {READ_ONLY_ROLES, COMMENT_ONLY_ROLES} from "../.."

const key = new PluginKey('accessRights')

export let accessRightsPlugin = function(options) {
    return new Plugin({
        key,
        filterTransaction: (transaction, state) => {
            let allowed = true
            let remote = transaction.getMeta('remote')
            let filterFree = transaction.getMeta('filterFree')
            if (remote || filterFree) {
                return allowed
            }

            if (
                COMMENT_ONLY_ROLES.includes(options.editor.docInfo.access_rights) ||
                READ_ONLY_ROLES.includes(options.editor.docInfo.access_rights)
            ) {
                allowed = false
            }

            if (transaction.docs.length && transaction.docs[0].childCount !== transaction.doc.childCount) {
                allowed = false
            }

            return allowed
        }
    })
}
