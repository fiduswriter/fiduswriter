import {messageTemplate, participantListTemplate} from "./templates"
import {localizeDate} from "../../common/common"

/*
* Functions for chat between users who access a document simultaneously.
*/

export class ModCollabChat {
    constructor(mod) {
        mod.chat = this
        this.mod = mod
        this.currentlyFlashing = false
        this.focus = true
        this.init()
    }

    beep() {
        let notification = jQuery('#chat-notification')[0]
        notification.play()
    }

    flashtab(messageTitle) {
        if (this.currentlyFlashing) {
            return false
        }
        let origTitle = document.title, that = this

        this.currentlyFlashing = true

        let changeDocumentTitle = window.setInterval(function () {
            if (this.focus) {
                window.clearInterval(changeDocumentTitle)
                document.title = origTitle
                that.currentlyFlashing = false
            }
            else {
                document.title = (document.title === origTitle) ?
                    messageTitle : origTitle
            }
        }, 500)
    }

    newMessage(message) {
        let existing = jQuery("#m" + message.id)
        if (existing.length > 0) return
        let theChatter = _.findWhere(this.mod.participants, {id:message.from})
        let node = jQuery(messageTemplate({message, theChatter, localizeDate}))
        node.hide()

        let chatContainer = jQuery("#chat-container")
        chatContainer.append(node)
        if (!this.focus) {
            this.beep()
            this.flashtab(message.from + ': ' + message.body)
        }
        if (chatContainer.css('display') === 'none') {
            jQuery("#chat").addClass('highlighted')
        }
        node.slideDown({
            progress: function () {
                chatContainer[0].scrollTop = chatContainer[0].scrollHeight
            }
        })

    }

    updateParticipantList(participants) {

        // If only one machine is connected and nothing has been chatted, don't show chat
        if (participants.length === 1 && jQuery(
            '#chat-container .message').length === 0) {
            jQuery('#chat').css('display', 'none');
            jQuery('#current-editors').css('display', 'none')
        }
        else {
            jQuery('#current-editors').html(participantListTemplate({
                participants: this.mod.participants
            }))
            jQuery('#chat').css('display', 'block')
            jQuery('#current-editors').css('display', 'block')
        }
    }

    sendMessage(messageText) {
        this.mod.editor.mod.serverCommunications.send({
            type: 'chat',
            body: messageText
        })
    }

    init() {
        let that = this

        jQuery(document.head).append(
            '<style>\n#messageform.empty:before{content:"' + gettext(
                'Send a message...') + '"}\n</style>')

        jQuery(document).ready(function () {
            jQuery('#chat-container').css('max-height', jQuery(window).height() -
                200 + 'px')

            jQuery('#chat .resize-button').on("click", function () {
                if (jQuery(this).hasClass('icon-angle-double-down')) {
                    jQuery(this).removeClass(
                        'icon-angle-double-down')
                    jQuery(this).addClass('icon-angle-double-up');
                    jQuery('#chat-container,#messageform').slideUp()
                }
                else {
                    jQuery(this).removeClass('icon-angle-double-up');
                    jQuery(this).addClass('icon-angle-double-down');
                    jQuery('#chat-container,#messageform').slideDown()
                    if (jQuery(this).parent().hasClass(
                        'highlighted')) {
                        jQuery(this).parent().animate({
                            backgroundColor: "#fff",
                        }, 1000, 'swing', function () {
                            jQuery(this).removeClass(
                                'highlighted').css(
                                'background-color', '')
                        });
                    }
                }
            })

            jQuery("#messageform").on("focus", function () {
                jQuery(this).removeClass('empty')
            })

            jQuery("#messageform").on("blur", function () {
                if (jQuery(this).text().length === 0) {
                    jQuery(this).addClass('empty')
                }
            })


            jQuery("#messageform").on("keypress", function (e) {
                if (e.keyCode == 13) {
                    that.sendMessage(jQuery(this).text())
                    jQuery(this).empty()
                    return false
                }
            })


        })

        jQuery(window).on("blur focus", function (e) {
            let prevType = jQuery(this).data("prevType");

            if (prevType != e.type) { //  reduce double fire issues
                switch (e.type) {
                case "blur":
                    that.focus = false;
                    break
                case "focus":
                    that.focus = true;
                    break
                }
            }

            jQuery(this).data("prevType", e.type)

        })
    }
}
