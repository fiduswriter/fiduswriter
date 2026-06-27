import {
    MAX_FW_DOCUMENT_VERSION as GENERIC_MAX_FW_DOCUMENT_VERSION,
    MIN_FW_DOCUMENT_VERSION as GENERIC_MIN_FW_DOCUMENT_VERSION,
    FidusFileImporter as GenericFidusFileImporter
} from "@fiduswriter/document/importer/native"
import {createNativeImporterBackend} from "./import"

export const MIN_FW_DOCUMENT_VERSION = GENERIC_MIN_FW_DOCUMENT_VERSION
export const MAX_FW_DOCUMENT_VERSION = GENERIC_MAX_FW_DOCUMENT_VERSION

export class FidusFileImporter extends GenericFidusFileImporter {
    constructor(
        file,
        user,
        path = "",
        check = false,
        contacts = [],
        e2eeOptions = null
    ) {
        super(
            file,
            user,
            path,
            createNativeImporterBackend(user, e2eeOptions),
            {
                check,
                contacts,
                e2eeOptions,
                checkDocUsers: check ? checkDocUsers : undefined
            }
        )
    }
}

function checkDocUsers(doc, user, contacts) {
    Object.values(doc.comments).forEach(comment => {
        if (
            !(
                contacts.find(
                    member =>
                        member.id === comment.user &&
                        member.username === comment.username
                ) ||
                (user.id === comment.user && user.username === comment.username)
            )
        ) {
            comment.user = 0
        }
        if (
            !(
                !comment.assignedUser ||
                contacts.find(
                    member =>
                        member.id === comment.assignedUser &&
                        member.username === comment.assignedUsername
                ) ||
                (user.id === comment.assignedUser &&
                    user.username === comment.assignedUsername)
            )
        ) {
            comment.assignedUser = 0
        }
        if (comment.answers) {
            comment.answers.forEach(answer => {
                if (
                    !(
                        contacts.find(
                            member =>
                                member.id === answer.user &&
                                member.username === answer.username
                        ) ||
                        (user.id === answer.user &&
                            user.username === answer.username)
                    )
                ) {
                    answer.user = 0
                }
            })
        }
    })
    checkDocUsersNode(doc.content, user, contacts)
    return doc
}

function checkDocUsersNode(node, user, contacts) {
    if (node.marks) {
        node.marks.forEach(mark => {
            if (["insertion", "deletion"].includes(mark.type)) {
                if (
                    !(
                        contacts.find(
                            member =>
                                member.id === mark.attrs.user &&
                                member.username === mark.attrs.username
                        ) ||
                        (user.id === mark.attrs.user &&
                            user.username === mark.attrs.username)
                    )
                ) {
                    mark.attrs.user = 0
                }
            }
        })
    }
    if (node.content) {
        node.content.forEach(childNode =>
            checkDocUsersNode(childNode, user, contacts)
        )
    }
}
