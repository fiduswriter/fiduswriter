import {localizeDate, escapeText} from "../../common"
import {getCommentHTML} from "../comments/editors"


/** A template for an answer to a comment */
let answerCommentTemplate = ({
        answer,
        author,
        commentId,
        activeCommentAnswerId,
        active,
        user,
        docInfo
    }) =>
    `<div class="comment-item">
        <div class="comment-user">
            <img class="comment-user-avatar" src="${author ? author.avatar : `${$StaticUrls.base$}img/default_avatar.png?v=${$StaticUrls.transpile.version$}`}">
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
               <p class="comment-p">${getCommentHTML(answer.answer)}</p>
           </div>
           ${
               active && (answer.user === user.id) ?
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
        author,
        active,
        editComment,
        user
    }) =>
    `<div class="comment-item">
        <div class="comment-user">
            <img class="comment-user-avatar" src="${author ? author.avatar : `${$StaticUrls.base$}img/default_avatar.png?v=${$StaticUrls.transpile.version$}`}">
            <h5 class="comment-user-name">${escapeText(author ? author.name : comment.username)}</h5>
            <p class="comment-date">${localizeDate(comment.date)}</p>
        </div>
        <div class="comment-text-wrapper">
            ${ active && editComment ?
                `<div id="comment-editor"></div>` :
                `<p class="comment-p">${getCommentHTML(comment.comment)}</p>`
            }
        </div>
        ${
            active && !editComment && comment.user===user.id ?
            `<p class="comment-controls">
                <span class="edit-comment" data-id="${comment.id}">${gettext("Edit")}</span>
            </p>` :
            ''
        }
    </div>`


/** A template for the editor of a first comment before it has been saved (not an answer to a comment). */
let firstCommentTemplate = ({
        comment,
        author
    }) =>
    `<div class="comment-item">
        <div class="comment-user">
            <img class="comment-user-avatar" src="${author ? author.avatar : `${$StaticUrls.base$}img/default_avatar.png?v=${$StaticUrls.transpile.version$}`}">
            <h5 class="comment-user-name">${escapeText(author ? author.name : comment.username)}</h5>
            <p class="comment-date">${localizeDate(comment.date)}</p>
        </div>
        <div class="comment-text-wrapper">
            <div id="comment-editor"></div>
        </div>
    </div>`


let commentTemplate = ({comment, view, active, editComment, activeCommentAnswerId, user, docInfo}) => {
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
    return comment.hidden ?
    `<div id="margin-box-${comment.id}" class="margin-box comment hidden"></div>` :
    `<div id="margin-box-${comment.id}" data-view="${view}" data-id="${comment.id}" data-user-id="${comment.user}"
            class="
                margin-box comment ${active ? 'active' : 'inactive'}
                ${comment.resolved ? 'resolved' : ''}
                ${comment.isMajor === true ? 'comment-is-major-bgc' : ''}
        ">
    ${
        comment.comment.length === 0 ?
        firstCommentTemplate({comment, author}) :
        singleCommentTemplate({comment, user, author, active, editComment})
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
                docInfo
            })
        ).join('') :
        ''
    }
    ${
        active && !activeCommentAnswerId && !editComment && 0 < comment.comment.length ?
        `<div class="comment-answer">
            <div id="answer-editor"></div>
        </div>` :
        ''
    }
    ${
        comment.id > 0 && (
            comment.user===user.id ||
            docInfo.access_rights==="write"
        ) ?
        `<span class="show-comment-options fa fa-ellipsis-v" data-id="${comment.id}"></span>
        <div class="comment-options fw-pulldown fw-right">
            <ul>
                <li>
                    <span class="fw-pulldown-item show-assign-comment-menu" title="${gettext('Assign comment to user')}">
                        ${gettext('Assign to')}
                        <span class="fw-icon-right"><i class="fa fa-caret-right"></i></span>
                    </span>
                    <div class="fw-pulldown assign-comment-menu">
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

let ACTIONS = {
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

let FORMAT_MARK_NAMES = {
    'em': gettext('Emphasis'),
    'strong': gettext('Strong')
}

let formatChangeTemplate = ({before, after}) => {
    let returnText = ''
    if (before.length) {
        returnText += `<div class="format-change-info"><b>${gettext('Removed')}:</b> ${before.map(markName => FORMAT_MARK_NAMES[markName]).join(', ')}</div>`
    }
    if (after.length) {
        returnText += `<div class="format-change-info"><b>${gettext('Added')}:</b> ${after.map(markName => FORMAT_MARK_NAMES[markName]).join(', ')}</div>`
    }
    return returnText
}

let BLOCK_NAMES = {
    paragraph: gettext('Paragraph'),
    heading: gettext('Heading %(level)s'),
    code_block: gettext('Code block')
}

let blockChangeTemplate = ({before}) => `<div class="format-change-info"><b>${gettext('Was')}:</b> ${interpolate(BLOCK_NAMES[before.type], before.attrs, true)}</div>`

let trackTemplate = ({type, data, node, pos, view, active, docInfo}) => {
    let author = data.user === docInfo.owner.id ? docInfo.owner : docInfo.owner.team_members.find(member => member.id === data.user),
        nodeActionType = `${type}_${node.type.name}`

    return `
        <div class="margin-box track ${active ? 'active' : 'inactive'}" data-type="${type}" data-pos="${pos}" data-view="${view}">
            <div class="track-${type}">
                <div class="track-title">${interpolate(ACTIONS[nodeActionType] ? ACTIONS[nodeActionType] : ACTIONS[type], node.attrs, true)}</div>
                <div class="comment-user">
                    <img class="comment-user-avatar" src="${author ? author.avatar : `${$StaticUrls.base$}img/default_avatar.png?v=${$StaticUrls.transpile.version$}`}">
                    <h5 class="comment-user-name">${escapeText(author ? author.name : data.username)}</h5>
                    <p class="comment-date">${node.type.name==='text' ? `${gettext('ca.')} ` : ''}${localizeDate(data.date*60000, 'minutes')}</p>
                </div>
                ${type==='format_change' ? formatChangeTemplate(data) : type==='block_change' ? blockChangeTemplate(data) : ''}
                ${
                    docInfo.access_rights === 'write' ?
                    `<div class="ui-dialog-buttonset">
                        <button class="fw-button fw-small fw-green track-accept" data-type="${type}" data-pos="${pos}" data-view="${view}">${gettext('Accept')}</button>
                        <button class="fw-button fw-small fw-orange track-reject" data-type="${type}" data-pos="${pos}" data-view="${view}">${gettext('Reject')}</button>
                    </div>` :
                    ''
                }
            </div>
        </div>`
}


/** A template to display all the margin boxes (comments, deletion/insertion notifications) */
export let marginBoxesTemplate = ({
        marginBoxes,
        editComment,
        activeCommentAnswerId,
        user,
        docInfo
    }) => marginBoxes.map(mBox => {
        switch(mBox.type) {
            case 'comment':
                return commentTemplate({comment: mBox.data, view: mBox.view, active: mBox.active, activeCommentAnswerId, editComment, user, docInfo})
                break
            case 'insertion':
            case 'deletion':
            case 'format_change':
            case 'block_change':
                return trackTemplate({
                    type: mBox.type,
                    node: mBox.node,
                    data: mBox.data,
                    pos: mBox.pos,
                    view: mBox.view,
                    active: mBox.active,
                    docInfo
                })
                break
            default:
                console.warn(`Unknown margin box type: ${mBox.type}`)
                break
        }
        return ''
    }).join('')
