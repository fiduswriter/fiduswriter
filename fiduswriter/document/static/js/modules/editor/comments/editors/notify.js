import {jsonPost} from "../../../common"
import {serializeCommentNode} from "./schema"

export const notifyMentionedUser = (docId, userId, comment, settings) => {
    const {html, text} = serializeCommentNode(comment)
    return jsonPost("/api/document/comment_notify/", settings, {
        doc_id: docId,
        collaborator_id: userId,
        comment_html: html,
        comment_text: text,
        type: "mention"
    })
}
