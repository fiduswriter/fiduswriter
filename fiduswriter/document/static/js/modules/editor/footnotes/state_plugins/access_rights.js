import {Plugin, PluginKey} from "prosemirror-state"

import {READ_ONLY_ROLES, COMMENT_ONLY_ROLES} from "../.."

const key = new PluginKey('accessRights')

export const accessRightsPlugin = function(options) {
    return new Plugin({
        key,
        filterTransaction: (tr, _state) => {
            let allowed = true
            const remote = tr.getMeta('remote')
            const filterFree = tr.getMeta('filterFree')
            if (remote || filterFree) {
                return allowed
            }

            if (
                COMMENT_ONLY_ROLES.includes(options.editor.docInfo.access_rights) ||
                READ_ONLY_ROLES.includes(options.editor.docInfo.access_rights)
            ) {
                allowed = false
            }

            if (tr.docs.length && tr.docs[0].childCount !== tr.doc.childCount) {
                allowed = false
            }

            return allowed
        }
    })
}
