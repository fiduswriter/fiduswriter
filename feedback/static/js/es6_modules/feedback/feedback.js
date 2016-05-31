import {csrfToken} from "../common/common"
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
        let that = this
        jQuery('a.feedback-tab').css('margin-top', jQuery('a.feedback-tab').outerWidth())
        jQuery('a.feedback-tab').click(function(event) {
          if(!jQuery('.feedback-panel').hasClass('open')) {
            jQuery('.feedback-panel').stop().fadeIn(that.speed, function() { jQuery('.feedback-panel').addClass('open') })
          }
          event.preventDefault()
        })
        jQuery('#closeFeedback').click(function() {
          jQuery('.feedback-panel').stop().fadeOut(that.speed, function() {
            jQuery('.feedback-panel').removeClass('open')
            jQuery('#feedback-form').css('visibility', 'visible')
            jQuery('#response-message').hide()
          })
        })

        jQuery("#feedbackbutton").click(function(){
            that.openFeedback()
        })
        this.verifyBrowser()
        window.bowser = bowser
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
            beforeSend: function(xhr, settings) {
                xhr.setRequestHeader("X-CSRFToken", csrfToken)
            },
            success : function() {
              jQuery('#closeFeedback').show()
              jQuery('#response-message').show()
            }
          })
          return false
    }

    // Check if cookie value exists (don't worry about what it is)
    checkCookie(name) {
        return document.cookie.split(";").some(
            function(cookie){
                return cookie.split("=")[0].trim()===name
            }
        )
    }

    // Add a cookie variable with name set to true
    setCookie(name) {
        document.cookie = `${name}=true`
    }

    // Verify that we are running one of the (semi)-verified browser.
    verifyBrowser() {
        if (!(bowser.chrome||bowser.firefox||bowser.msedge||(bowser.safari && bowser.mac)) &! this.checkCookie('browsertest')) {
            this.setCookie('browsertest')
            let warning = gettext(`Please be aware that you are running a browser
                that has not yet been tested with Fidus Writer so your mileage may vary.<br
                We recommend using Google Chrome. Fidus Writer will currently not run on iOS.`)
            let diaButtons = {}
            diaButtons[gettext("OK")] = function() {
                jQuery(this).dialog("close")
            }
            jQuery(`<div>${warning}</div>`).dialog({
                modal: true,
                title: gettext("Warning"),
                buttons: diaButtons
            })
        }
    }
}
