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
        this.verifyBrowser()
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

    // Verify that we are running one of the (semi)-verified browser.
    verifyBrowser() {
        if ((!(bowser.chrome||bowser.firefox||bowser.msedge||bowser.safari) || bowser.mobile || bowser.tablet) &! getCookie('browsercheck')) {
            this.setCookie('browsercheck')
            let warning = gettext(`<p>Please be aware that you are running a browser
                that has not yet been tested with Fidus Writer, so your mileage may vary.
                Fidus Writer will currently not run on mobile platforms or Internet Explorer.</p>
                <p>We recommend using Google Chrome on a desktop computer. </p>`)
            let diaButtons = {}
            diaButtons[gettext("OK")] = function() {
                jQuery(this).dialog("close")
            }
            jQuery(`<div>${warning}</div>`).dialog({
                modal: true,
                title: gettext("Warning"),
                minHeight: 250,
                buttons: diaButtons,
                create:function () {
                    jQuery(this).closest(".ui-dialog")
                    .find(".ui-dialog-buttonpane .ui-button:first")
                    .addClass("fw-button fw-orange")
                }
            })
        }
    }
}
