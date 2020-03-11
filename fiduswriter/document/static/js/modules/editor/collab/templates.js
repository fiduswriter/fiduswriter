import {escapeText, localizeDate} from "../../common"
export const messageTemplate = ({message, theChatter}) =>
    `<div class="message" id="m${message.id}">
        <div class="comment-user">
            ${theChatter.avatar.html}
            <h5 class="comment-user-name">${escapeText(theChatter.name)}</h5>
            <p class="comment-date">${localizeDate(new Date())}</p>
        </div>
        <div class="message-body">${escapeText(message.body)}</div>
    </div>`
