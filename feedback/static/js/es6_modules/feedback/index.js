import {csrfToken, getCookie} from "../common"
import * as bowser from "bowser/bowser"

// Creates the feedback tab. The tab is meant for user feedback to the developers while FW is still in
// a somewhat early stage. It is therefore included in a way so it's easy to remove from all the
// templates.

// This is therefore also where browser sniffing happens to prevent still unsupported browsers from logging in.

export class FeedbackTab {
    constructor() {
        this.speed = 300
        this.bind()
    }

    bind() {
        jQuery('a.feedback-tab').css('margin-top', jQuery('a.feedback-tab').outerWidth())
        jQuery('a.feedback-tab').click(event => {
        if(!jQuery('.feedback-panel').hasClass('open')) {
            jQuery('.feedback-panel').stop().fadeIn(
                this.speed,
                () => {jQuery('.feedback-panel').addClass('open')}
            )
        }
        event.preventDefault()
        })
        jQuery('#closeFeedback').click(() => {
            jQuery('.feedback-panel').stop().fadeOut(this.speed, () => {
                jQuery('.feedback-panel').removeClass('open')
                jQuery('#feedback-form').css('visibility', 'visible')
                jQuery('#response-message').hide()
            })
        })

        jQuery("#feedbackbutton").click(() => {
            this.openFeedback()
        })
    }

    openFeedback() {
        let message = jQuery("textarea#message").val()
        let data = {message}

        jQuery('#closeFeedback').hide()
        jQuery('#feedback-form').css('visibility', 'hidden')

        jQuery.ajax({
            type : "POST",
            url : "/feedback/feedback/",
            data : data,
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: (xhr, settings) =>
                xhr.setRequestHeader("X-CSRFToken", csrfToken),
            success : () => {
                jQuery('#closeFeedback').show()
                jQuery('#response-message').show()
            }
        })
        return false
    }

    // Add a cookie variable with name set to true
    setCookie(name) {
        document.cookie = `${name}=true`
    }

}
