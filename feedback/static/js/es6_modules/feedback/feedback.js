import {csrfToken} from "../common/common"

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
}
