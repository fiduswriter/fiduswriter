import {localizeDate, escapeText} from "../../common"
import {serializeComment} from "../comments/editors"
import {serializeHelp} from "../../document_template"

/** A template for an answer to a comment */
const answerCommentTemplate = ({
        answer,
        author,
        commentId,
        activeCommentAnswerId,
        active,
        user
    }) =>
    `<div class="comment-item comment-answer" id="comment-answer-${answer.id}">
        <div class="comment-user">
            ${author ? author.avatar.html : `<span class="fw-string-avatar"></span>`}
            <h5 class="comment-user-name">${escapeText(author ? author.name : answer.username)}</h5>
            <p class="comment-date">${localizeDate(answer.date)}</p>
        </div>
        ${
            active && answer.id === activeCommentAnswerId ?
            `<div class="comment-text-wrapper">
                <div class="comment-answer-form">
                    <div id="answer-editor"></div>
                </div>
           </div>` :
           `<div class="comment-text-wrapper">
               <p class="comment-p">${serializeComment(answer.answer).html}</p>
           </div>
           ${
               answer.user === user.id ?
               `<span class="show-marginbox-options fa fa-ellipsis-v"></span>
               <div class="marginbox-options fw-pulldown fw-right">
                   <ul>
                      <li><span class="fw-pulldown-item edit-comment-answer" data-id="${commentId}" data-answer="${answer.id}" title="${gettext('Edit')}">
                        ${gettext('Edit')}
                      </span></li>
                      <li><span class="fw-pulldown-item delete-comment-answer" data-id="${commentId}" data-answer="${answer.id}" title="${gettext('Delete')}">
                        ${gettext('Delete')}
                      </span></li>
                   </ul>
               </div>` :
               ''
           }`
       }
    </div>`

/** A template to show one individual comment */
const singleCommentTemplate = ({
        comment,
        author,
        active,
        editComment
    }) =>
    `<div class="comment-item">
        <div class="comment-user">
            ${author ? author.avatar.html : `<span class="fw-string-avatar"></span>`}
            <h5 class="comment-user-name">${escapeText(author ? author.name : comment.username)}</h5>
            <p class="comment-date">${localizeDate(comment.date)}</p>
        </div>
        <div class="comment-text-wrapper">
            ${ active && editComment ?
                `<div id="comment-editor"></div>` :
                `<p class="comment-p">${serializeComment(comment.comment).html}</p>`
            }
        </div>
    </div>`


/** A template for the editor of a first comment before it has been saved (not an answer to a comment). */
const firstCommentTemplate = ({
        comment,
        author
    }) =>
    `<div class="comment-item">
        <div class="comment-user">
            ${author ? author.avatar.html : `<span class="fw-string-avatar"></span>`}
            <h5 class="comment-user-name">${escapeText(author ? author.name : comment.username)}</h5>
            <p class="comment-date">${localizeDate(comment.date)}</p>
        </div>
        <div class="comment-text-wrapper">
            <div id="comment-editor"></div>
        </div>
    </div>`

const helpTemplate = ({help, filterOptions}) => {
    if (!filterOptions.help) {
        return '<div class="margin-box help hidden"></div>'
    } else {
        return `<div class="margin-box help ${help.active ? 'active' : ''}"><div class="help-text-wrapper">${serializeHelp(help.help)}</div></div>`
    }
}


const commentTemplate = ({comment, view, active, editComment, activeCommentAnswerId, user, docInfo, filterOptions, staticUrl}) => {
    if (
        !filterOptions.comments ||
        (filterOptions.commentsOnlyMajor && !comment.isMajor) ||
        (!filterOptions.commentsResolved && comment.resolved) ||
        (filterOptions.author && comment.user !== filterOptions.author) ||
        (filterOptions.assigned && comment.assignedUser !== filterOptions.assigned) ||
        comment.hidden
    ) {
        return '<div class="margin-box comment hidden"></div>'
    }
    const author = comment.user === docInfo.owner.id ? docInfo.owner : docInfo.owner.team_members.find(member => member.id === comment.user),
        assignedUser = comment.assignedUser ?
            comment.assignedUser === docInfo.owner.id ?
                docInfo.owner :
                docInfo.owner.team_members.find(member => member.id === comment.assignedUser)  ||
                {
                    name: comment.assignedUsername || ''
                } :
            false,
        assignedUsername = assignedUser ? assignedUser.name : false
    return `
        <div id="margin-box-${comment.id}" data-view="${view}" data-id="${comment.id}" data-user-id="${comment.user}"
            class="margin-box comment ${active ? 'active' : 'inactive'} ${comment.resolved ? 'resolved' : ''} ${comment.isMajor === true ? 'comment-is-major-bgc' : ''}">
    ${
        comment.comment.length === 0 ?
        firstCommentTemplate({comment, author, staticUrl}) :
        singleCommentTemplate({comment, user, author, active, editComment, staticUrl})
    }
    ${
        assignedUsername ?
            `<div class="assigned-user">${gettext('Assigned to')} <em>${escapeText(assignedUsername)}</em></div>` :
        ''
    }
    ${
        comment.answers ?
        comment.answers.map(answer =>
            answerCommentTemplate({
                answer,
                author: answer.user === docInfo.owner.id ? docInfo.owner : docInfo.owner.team_members.find(member => member.id === answer.user),
                commentId: comment.id,
                active,
                activeCommentAnswerId,
                user,
                docInfo,
                staticUrl
            })
        ).join('') :
        ''
    }
    ${
        active && !activeCommentAnswerId && !editComment && 0 < comment.comment.length ?
        `<div class="comment-item comment-answer">
            <div id="answer-editor"></div>
        </div>` :
        ''
    }
    ${
        comment.id > 0 && (
            comment.user===user.id ||
            docInfo.access_rights==="write"
        ) && !editComment ?
        `<span class="show-marginbox-options fa fa-ellipsis-v" data-id="${comment.id}"></span>
        <div class="marginbox-options fw-pulldown fw-right">
            <ul>
                ${
                    comment.user===user.id ?
                    `<li><span class="fw-pulldown-item edit-comment" data-id="${comment.id}" title="${gettext("Edit")}">
                        ${gettext("Edit")}
                    </span></li>` :
                    ''
                }
                <li>
                    <span class="fw-pulldown-item show-marginbox-options-submenu" title="${gettext('Assign comment to user')}">
                        ${gettext('Assign to')}
                        <span class="fw-icon-right"><i class="fa fa-caret-right"></i></span>
                    </span>
                    <div class="fw-pulldown marginbox-options-submenu">
                        <ul>
                            <li><span class="fw-pulldown-item unassign-comment" data-id="${comment.id}" title="${gettext('Remove user assignment from comment')}">${gettext('No-one')}</span></li>
                        ${
                            docInfo.owner.team_members.concat(docInfo.owner).map(
                                user => `<li><span class="fw-pulldown-item assign-comment" data-id="${comment.id}" data-user="${user.id}" data-username="${escapeText(user.name)}" title="${gettext('Assign comment to')} ${escapeText(user.name)}">${escapeText(user.name)}</span></li>`
                            ).join('')
                        }
                        </ul>
                    </div>
                </li>
                <li>
                    ${
                        comment.resolved ?
                        `<span class="fw-pulldown-item recreate-comment" data-id="${comment.id}" title="${gettext('Recreate comment')}">${gettext('Recreate')}</span>` :
                        `<span class="fw-pulldown-item resolve-comment" data-id="${comment.id}" title="${gettext('Resolve comment')}">${gettext('Resolve')}</span>`
                    }

                </li>
                <li>
                    <span class="fw-pulldown-item delete-comment" data-id="${comment.id}" title="${gettext('Delete comment')}">${gettext('Delete')}</span>
                </li>
            </ul>
        </div>
        ` :
        ''
    }
    </div>`
}

const ACTIONS = {
    insertion: gettext('Insertion'),
    deletion: gettext('Deletion'),
    format_change: gettext('Format change'),
    block_change: gettext('Block change'),
    insertion_paragraph: gettext('New paragraph'),
    insertion_heading: gettext('New heading'),
    insertion_citation: gettext('Inserted citation'),
    insertion_blockquote: gettext('Wrapped into blockquote'),
    insertion_code_block: gettext('Added code block'),
    insertion_figure: gettext('Inserted figure'),
    insertion_list_item: gettext('New list item'),
    insertion_table: gettext('Inserted table'),
    insertion_keyword: gettext('New keyword: %(keyword)s'),
    deletion_paragraph: gettext('Merged paragraph'),
    deletion_heading: gettext('Merged heading'),
    deletion_citation: gettext('Deleted citation'),
    deletion_blockquote: gettext('Unwrapped blockquote'),
    deletion_code_block: gettext('Removed code block'),
    deletion_figure: gettext('Deleted figure'),
    deletion_list_item: gettext('Lifted list item'),
    deletion_table: gettext('Delete table'),
    deletion_keyword: gettext('Deleted keyword: %(keyword)s'),
    block_change_paragraph: gettext('Changed into paragraph'),
    block_change_heading: gettext('Changed into heading %(level)s'),
    block_change_code_block: gettext('Changed into code block')
}

const FORMAT_MARK_NAMES = {
    'em': gettext('Emphasis'),
    'strong': gettext('Strong'),
    'underline': gettext('Underline')
}

const formatChangeTemplate = ({before, after}) => {
    let returnText = ''
    if (before.length) {
        returnText += `<div class="format-change-info"><b>${gettext('Removed')}:</b> ${before.map(markName => FORMAT_MARK_NAMES[markName]).join(', ')}</div>`
    }
    if (after.length) {
        returnText += `<div class="format-change-info"><b>${gettext('Added')}:</b> ${after.map(markName => FORMAT_MARK_NAMES[markName]).join(', ')}</div>`
    }
    return returnText
}

const BLOCK_NAMES = {
    paragraph: gettext('Paragraph'),
    heading1: gettext('Heading 1'),
    heading2: gettext('Heading 2'),
    heading3: gettext('Heading 3'),
    heading4: gettext('Heading 4'),
    heading5: gettext('Heading 5'),
    heading6: gettext('Heading 6'),
    code_block: gettext('Code block')
}

const blockChangeTemplate = ({before}) => `<div class="format-change-info"><b>${gettext('Was')}:</b> ${BLOCK_NAMES[before.type]}</div>`

const trackTemplate = ({type, data, node, active, docInfo, filterOptions}) => {
    if (!filterOptions.track) {
        return '<div class="margin-box track hidden"></div>'
    }

    const author = data.user === docInfo.owner.id ? docInfo.owner : docInfo.owner.team_members.find(member => member.id === data.user),
        nodeActionType = `${type}_${node.type.name}`

    return `
        <div class="margin-box track ${active ? 'active' : 'inactive'}" data-type="${type}">
            <div class="track-${type}">
                <div class="comment-user">
                    ${author ? author.avatar.html : `<span class="fw-string-avatar"></span>`}
                    <h5 class="comment-user-name">${escapeText(author ? author.name : data.username)}</h5>
                    <p class="comment-date">${node.type.name==='text' ? `${gettext('ca.')} ` : ''}${localizeDate(data.date*60000, 'minutes')}</p>
                </div>
                <div class="track-title">
                    ${interpolate(ACTIONS[nodeActionType] ? ACTIONS[nodeActionType] : ACTIONS[type], node.attrs, true)}
                </div>
                ${type==='format_change' ? formatChangeTemplate(data) : type==='block_change' ? blockChangeTemplate(data) : ''}
            </div>
            ${
                docInfo.access_rights === 'write' ?
                    `<div class="track-ctas">
                        <button class="track-accept fw-button fw-dark" type="submit" data-type="${type}">${gettext("Accept")}</button>
                        <button class="track-reject fw-button fw-orange" type="submit" data-type="${type}">${gettext("Reject")}</button>
                    </div>` : ''
            }

        </div>`
}

export const marginboxFilterTemplate = ({marginBoxes, filterOptions, docInfo}) => {
    const comments = marginBoxes.find(box => box.type==='comment')
    const tracks = marginBoxes.find(box => ['insertion', 'deletion', 'format_change', 'block_change'].includes(box.type))
    const help = marginBoxes.find(box => box.type==='help')
    let filterHTML = ''
    if (comments || filterOptions.commentsOnlyMajor) {
        filterHTML += `<div id="margin-box-filter-comments" class="margin-box-filter-button${filterOptions.comments ? '' : ' disabled'}">
            <span class="label">${gettext('Comments')}</span>
            <span class="show-marginbox-options fa fa-ellipsis-v"></span>
            <div class="marginbox-options fw-pulldown fw-right"><ul>
                <li>
                    <span class="fw-pulldown-item show-marginbox-options-submenu" title="${gettext('Author')}">
                        ${gettext('Author')}
                        <span class="fw-icon-right"><i class="fa fa-caret-right"></i></span>
                    </span>
                    <div class="fw-pulldown marginbox-options-submenu">
                        <ul>
                            <li><span class="fw-pulldown-item margin-box-filter-comments-author${filterOptions.author === 0 ? ' selected' : ''}" data-id="0" title="${gettext('Show comments from all authors.')}">
                                ${gettext('Any')}
                            </span></li>
                        ${
                            docInfo.owner.team_members.concat(docInfo.owner).map(
                                user => `<li><span class="fw-pulldown-item margin-box-filter-comments-author${filterOptions.author === user.id ? ' selected' : ''}" data-id="${user.id}" title="${gettext('Show comments of ')} ${escapeText(user.name)}">
                                    ${escapeText(user.name)}
                                </span></li>`
                            ).join('')
                        }
                        </ul>
                    </div>
                </li>
                <li>
                    <span class="fw-pulldown-item show-marginbox-options-submenu" title="${gettext('Assignee')}">
                        ${gettext('Assignee')}
                        <span class="fw-icon-right"><i class="fa fa-caret-right"></i></span>
                    </span>
                    <div class="fw-pulldown marginbox-options-submenu">
                        <ul>
                            <li><span class="fw-pulldown-item margin-box-filter-comments-assigned${filterOptions.assigned === 0 ? ' selected' : ''}" data-id="0" title="${gettext('Show comments from all authors.')}">
                                ${gettext('Any/None')}
                            </span></li>
                        ${
                            docInfo.owner.team_members.concat(docInfo.owner).map(
                                user => `<li><span class="fw-pulldown-item margin-box-filter-comments-assigned${filterOptions.assigned === user.id ? ' selected' : ''}" data-id="${user.id}" title="${gettext('Show comments of ')} ${escapeText(user.name)}">
                                    ${escapeText(user.name)}
                                </span></li>`
                            ).join('')
                        }
                        </ul>
                    </div>
                </li>
                <li>
                    <span class="fw-pulldown-item margin-box-filter-comments-check">
                        <input type="checkbox" class="fw-check fw-label-check"${filterOptions.commentsOnlyMajor ? ' checked' : ''} id="margin-box-filter-comments-only-major">
                        <label for="margin-box-filter-comments-only-major">${gettext('Only major comments')}</label>
                    </span>
                </li>
                <li>
                    <span class="fw-pulldown-item margin-box-filter-comments-check">
                        <input type="checkbox" class="fw-check fw-label-check"${filterOptions.commentsResolved ? ' checked' : ''} id="margin-box-filter-comments-resolved">
                        <label for="margin-box-filter-comments-resolved">${gettext('Resolved comments')}</label>
                    </span>
                </li>
            </ul></div>
        </div>`
    }
    if (tracks) {
        filterHTML += `<div id="margin-box-filter-track" class="margin-box-filter-button${filterOptions.track ? '' : ' disabled'}">
            <span class="label">${gettext('Track changes')}</span>
        </div>`
    }
    if (help) {
        filterHTML += `<div id="margin-box-filter-help" class="margin-box-filter-button${filterOptions.help ? '' : ' disabled'}">
            <span class="label">${gettext('Instructions')}</span>
        </div>`
    }
    return filterHTML
}



/** A template to display all the margin boxes (comments, deletion/insertion notifications) */
export const marginBoxesTemplate = ({
        marginBoxes,
        editComment,
        activeCommentAnswerId,
        user,
        docInfo,
        filterOptions,
        staticUrl
    }) => `<div id="margin-box-container"><div>${
        marginBoxes.map(mBox => {
        let returnValue = ''
        switch (mBox.type) {
            case 'comment':
                returnValue = commentTemplate({
                    comment: mBox.data,
                    view: mBox.view,
                    active: mBox.active,
                    activeCommentAnswerId,
                    editComment,
                    user,
                    docInfo,
                    filterOptions,
                    staticUrl
                })
                break
            case 'insertion':
            case 'deletion':
            case 'format_change':
            case 'block_change':
                returnValue = trackTemplate({
                    type: mBox.type,
                    node: mBox.node,
                    data: mBox.data,
                    active: mBox.active,
                    docInfo,
                    filterOptions,
                    staticUrl
                })
                break
            case 'help':
                return helpTemplate({help: mBox.data, filterOptions})
            default:
                break
        }
        return returnValue
    }).join('')
    }</div></div>`
