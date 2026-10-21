import {post} from "../../../common"
import {serializeCommentNode} from "./schema"

export const notifyMentionedUser = (docId, userId, comment, e2ee = false) => {
    // comment content is never sent to the notification
    // endpoint for encrypted documents.
    const {html, text} = e2ee
        ? {html: "", text: ""}
        : serializeCommentNode(comment)
    return post("/api/document/comment_notify/", {
        doc_id: docId,
        collaborator_id: userId,
        comment_html: html,
        comment_text: text,
        type: "mention"
    })
}
