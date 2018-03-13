import {messageTemplate} from "./templates"
import {localizeDate} from "../../common"

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
        let notification = document.getElementById('chat-notification')
        notification.play()
    }

    flashtab(messageTitle) {
        if (this.currentlyFlashing) {
            return false
        }
        let origTitle = document.title

        this.currentlyFlashing = true

        let changeDocumentTitle = window.setInterval(() => {
            if (this.focus) {
                window.clearInterval(changeDocumentTitle)
                document.title = origTitle
                this.currentlyFlashing = false
            }
            else {
                document.title = (document.title === origTitle) ?
                    messageTitle : origTitle
            }
        }, 500)
    }

    newMessage(message) {
        if (document.getElementById(`m${message.id}`)) {
            return
        }
        let theChatter = this.mod.participants.find(participant => participant.id === message.from)

        let chatContainer = document.getElementById("chat-container")
        chatContainer.insertAdjacentHTML('beforeend', messageTemplate({message, theChatter, localizeDate}))
        if (!this.focus) {
            this.beep()
            this.flashtab(message.from + ': ' + message.body)
        }
        if (chatContainer.css('display') === 'none') {
            document.getElementById("chat").classList.add('highlighted')
        }
        jQuery(chatContainer.lastElementChild).slideDown({
            progress: function () {
                chatContainer.scrollTop = chatContainer.scrollHeight
            }
        })

    }

    showChat(participants) {

        // If only one machine is connected and nothing has been chatted, don't show chat
        if (participants.length === 1 && !document.querySelector('#chat-container .message')) {
            document.getElementById('chat').style.display = 'none'
        }
        else {
            document.getElementById('chat').style.display = 'block'
        }
    }

    sendMessage(messageText) {
        this.mod.editor.mod.serverCommunications.send(() => ({
            type: 'chat',
            body: messageText
        }))
    }

    init() {

        jQuery(document.head).append(
            '<style>\n#messageform.empty:before{content:"' + gettext(
                'Send a message...') + '"}\n</style>')
        let that = this
        jQuery(document).ready(function () {
            jQuery('#chat-container').css('max-height', jQuery(window).height() -
                200 + 'px')

            jQuery('#chat .resize-button').on("click", function (event) {
                if (this.classList.contains('fa-angle-double-down')) {
                    this.classList.remove('fa-angle-double-down')
                    this.classList.add('fa-angle-double-up')
                    jQuery('#chat-container,#messageform').slideUp()
                }
                else {
                    this.classList.remove('fa-angle-double-up')
                    this.classList.add('fa-angle-double-down')
                    jQuery('#chat-container,#messageform').slideDown()
                    if (this.parentElement.classList.contains(
                        'highlighted')) {
                        jQuery(this).parent().animate({
                            backgroundColor: "#fff",
                        }, 1000, 'swing', function () {
                            this.classList.remove('highlighted')
                            this.style.backgroundColor = ''
                        });
                    }
                }
            })

            jQuery("#messageform").on("focus", function () {
                this.classList.remove('empty')
            })

            jQuery("#messageform").on("blur", function () {
                if (this.innerText.length === 0) {
                    this.classList.add('empty')
                }
            })


            jQuery("#messageform").on("keypress", function (event) {
                if (event.keyCode == 13) {
                    that.sendMessage(jQuery(this).text())
                    jQuery(this).empty()
                    return false
                }
            })


        })

        jQuery(window).on("blur focus", function (event) {
            let prevType = this.getAttribute('data-prev-type')

            if (prevType != event.type) { //  reduce double fire issues
                switch (event.type) {
                case "blur":
                    that.focus = false;
                    break
                case "focus":
                    that.focus = true;
                    break
                }
            }

            this.setAttribute('data-prev-type', event.type)

        })
    }
}
