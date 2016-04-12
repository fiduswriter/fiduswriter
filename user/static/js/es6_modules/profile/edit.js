/** Save changes to user account. */
let editUser = function(postData) {
    $.ajax({
        url : '/account/save/',
        data : postData,
        type : 'POST',
        beforeSend: function() {
            jQuery('#edit_user').attr("disabled","disabled") //Disable the submit button - can't click twice
            jQuery('.errorlist').remove() // Get rid of any old error uls
            jQuery('#emsg').fadeOut('slow') // Get rid of the main status message
        },
        success : function(response, textStatus, jqXHR) {
            jQuery('#edit_user').removeAttr("disabled")
            let eMsg = gettext("Profile updated")
            jQuery('#emsg').text( eMsg ).fadeIn('slow').fadeOut('slow')

        },
        error: function (jqXHR, textStatus, errorThrown) {
            if(422 == jqXHR.status) {
                jQuery('#edit_user').removeAttr("disabled")
                let response = $.parseJSON(jqXHR.responseText)
                $.each(response.errors,function(fieldname,errmsg) {
                    firstError = '<span class="errorlist">'+errmsg[0]+'</span>'
                    jQuery('#'+fieldname).after(firstError)
                })
                let eMsg = gettext("Please check the above errors")
                jQuery('#emsg').text( eMsg ).fadeIn('slow')
            } else {
            console.log(jqXHR.responseText)
            }
        },
    })
}

export let bind = function() {
    jQuery(document).ready(function() {
        jQuery(document).on('click', '#edit_user', function() {
            let formData = {}
            formData['user'] = {}
            formData['user']['username'] = jQuery('#username').val()
            formData['user']['first_name'] = jQuery('#first_name').val()
            formData['user']['last_name'] = jQuery('#last_name').val()
            formData['profile'] = {}
            formData['profile']['about'] = jQuery('#profile_about').val()
            // Some of these form data are for the user model, others for the user profile model,
            // so we pack it all up in a json package (formData) and unpack it on the server.
            postData = {}
            postData['form_data'] = JSON.stringify(formData)
            postData['csrfmiddlewaretoken'] = jQuery('input[name="csrfmiddlewaretoken"]').val()
            editUser(postData)
        })
    })
}
