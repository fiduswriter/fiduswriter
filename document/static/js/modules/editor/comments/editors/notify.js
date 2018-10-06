import {post} from "../../../common"
import {serializeCommentNode} from "./schema"


export let notifyMentionedUser = (docId, userId, comment) => {

    let {html, text} = serializeCommentNode(comment)
    return post(
        '/document/comment_notify/',
        {
            doc_id: docId,
            collaborator_id: userId,
            comment_html: html,
            comment_text: text,
            type: 'mention'
        }
    )
}
