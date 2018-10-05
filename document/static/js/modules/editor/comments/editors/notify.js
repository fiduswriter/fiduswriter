import {post} from "../../../common"

export let notifyUser = (docId, userId, commentText, commentHTML) =>
    post(
        '/document/comment_notify/',
        {
            doc_id: docId,
            collaborator_id: userId,
            comment_html: commentHTML,
            comment_text: commentText
        }
    )
