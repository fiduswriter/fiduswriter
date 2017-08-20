import {localizeDate, escapeText} from "../../common"

/** A template for an answer to a comment */
let answerCommentTemplate = ({
        answer,
        commentId,
        activeCommentAnswerId,
        active,
        editor
    }) =>
    `<div class="comment-item">
        <div class="comment-user">
            <img class="comment-user-avatar" src="${answer.userAvatar}">
            <h5 class="comment-user-name">${answer.userName}</h5>
            <p class="comment-date">${localizeDate(answer.date)}</p>
        </div>
        ${
            active && answer.id === activeCommentAnswerId ?
            `<div class="comment-text-wrapper">
                <div class="comment-answer-form">
                    <textarea class="commentAnswerText" data-id="${commentId}" data-answer="${answer.id}" rows="3">${answer.answer}</textarea>
                    <span class="submit-comment-answer-edit fw-button fw-dark">${gettext("Edit")}</span>
                    <span class="cancelSubmitComment fw-button fw-orange">${gettext("Cancel")}</span>
                </div>
           </div>` :
           `<div class="comment-text-wrapper">
               <p class="comment-p">${escapeText(answer.answer)}</p>
           </div>
           ${
               active && (answer.user === editor.user.id || editor.docInfo.is_owner) ?
               `<p class="comment-controls">
                   <span class="edit-comment-answer" data-id="${commentId}" data-answer="${answer.id}">${gettext("Edit")}</span>
                   <span class="delete-comment-answer" data-id="${commentId}" data-answer="${answer.id}">${gettext("Delete")}</span>
               </p>` :
               ''
           }`
       }
    </div>`

/** A template to show one individual comment */
let singleCommentTemplate = ({
        comment,
        active,
        editor
    }) =>
    `<div class="comment-item">
        <div class="comment-user">
            <img class="comment-user-avatar" src="${comment.userAvatar}">
            <h5 class="comment-user-name">${escapeText(comment.userName)}</h5>
            <p class="comment-date">${localizeDate(comment.date)}</p>
        </div>
        <div class="comment-text-wrapper">
            <p class="comment-p">${escapeText(comment.comment)}</p>
            <div class="comment-form">
                <textarea class="commentText" data-id="${comment.id}" rows="5"> </textarea>
                <input class="comment-is-major" type="checkbox" name="isMajor"
                    ${comment['review:isMajor'] ? 'checked' : ''}/>
                ${gettext("Is major")}<br />
                <span class="submitComment fw-button fw-dark">${gettext("Edit")}</span>
                <span class="cancelSubmitComment fw-button fw-orange">${gettext("Cancel")}</span>
            </div>
        </div>
        ${
            active && comment.user===editor.user.id ?
            `<p class="comment-controls">
                <span class="edit-comment">${gettext("Edit")}</span>
                <span class="delete-comment" data-id="${comment.id}">${gettext("Delete")}</span>
            </p>` :
            ''
        }
    </div>`


/** A template for the editor of a first comment before it has been saved (not an answer to a comment). */
let firstCommentTemplate = ({
        comment
    }) =>
    `<div class="comment-item">
        <div class="comment-user">
            <img class="comment-user-avatar" src="${comment.userAvatar}">
            <h5 class="comment-user-name">${escapeText(comment.userName)}</h5>
            <p class="comment-date">${localizeDate(comment.date)}</p>
        </div>
        <div class="comment-text-wrapper">
            <textarea class="commentText" data-id="${comment.id}" rows="5"></textarea>
            <input class="comment-is-major" type="checkbox" name="isMajor" value="0" />${gettext("Is major")}<br />
            <span class="submitComment fw-button fw-dark">${gettext("Submit")}</span>
            <span class="cancelSubmitComment fw-button fw-orange">${gettext("Cancel")}</span>
        </div>
    </div>`


/** A template to display all the comments */
export let commentsTemplate = ({
        theComments,
        activeCommentId,
        activeCommentAnswerId,
        editor
    }) =>
    theComments.map(comment =>
        comment.hidden ?
        `<div id="comment-box-${comment.id}" class="comment-box hidden"></div>` :
        `<div id="comment-box-${comment.id}" data-id="${comment.id}"  data-user-id="${comment.user}"
                class="
                    comment-box ${comment.id === activeCommentId ? 'active' : 'inactive'}
                    ${comment["review:isMajor"] === true ? 'comment-is-major-bgc' : ''}
            ">
        ${
            comment.comment.length === 0 ?
            firstCommentTemplate({comment}) :
            singleCommentTemplate({comment, active: (comment.id===activeCommentId), editor})
        }
        ${
            comment.answers ?
            comment.answers.map(answer =>
                answerCommentTemplate({
                    answer,
                    commentId: comment.id,
                    active: (comment.id===activeCommentId),
                    activeCommentAnswerId,
                    editor
                })
            ).join('') :
            ''
        }
        ${
            comment.id===activeCommentId && 0 < comment.comment.length ?
            `<div class="comment-answer">
                <textarea class="comment-answer-text" rows="1"></textarea>
                <div class="comment-answer-btns">
                    <button class="comment-answer-submit fw-button fw-dark" type="submit">
                        ${gettext("Submit")}
                    </button>
                    <button class="cancelSubmitComment fw-button fw-orange" type="submit">
                        ${gettext("Cancel")}
                    </button>
                </div>
            </div>` :
            ''
        }
        ${
            comment.id===activeCommentId && (
                comment.user===editor.user.id ||
                editor.docInfo.access_rights==="write"
            ) ?
            `<span class="delete-comment-all delete-comment fa fa-times-circle"
                    data-id="${comment.id}">
            </span>` :
            ''
        }
        </div>`
    ).join('')

export let filterByUserBoxTemplate = ({
        users
    }) =>
    `<div id="comment-filter-byuser-box" title="${gettext("Filter by user")}">
        <select>
            ${
                users.map(
                    user => `<option value="${user.user_id}">
                                ${escapeText(user.user_name)}
                            </option>`
                )
            }
        </select>
    </div>`
