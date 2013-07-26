//edit user
function editUser(post_data) {
    $.ajax({
        url : '/account/save/',
        data : post_data,
        type : 'POST',
        beforeSend: function() {
            $('#edit_user').attr("disabled","disabled"); //Disable the submit button - can't click twice
            $('.errorlist').remove(); // Get rid of any old error uls
            $('#emsg').fadeOut('slow'); // Get rid of the main status message
        },
        success : function(response, textStatus, jqXHR) {
            $('#edit_user').removeAttr("disabled");
            e_msg = gettext("Profile updated");
            $('#emsg').text( e_msg ).fadeIn('slow').fadeOut('slow');
            
        },
        error: function (jqXHR, textStatus, errorThrown) {
            if(422 == jqXHR.status) { 
                $('#edit_user').removeAttr("disabled");
                var response = $.parseJSON(jqXHR.responseText);
                $.each(response.errors,function(fieldname,errmsg) {
                    firstError = '<span class="errorlist">'+errmsg[0]+'</span>';
                    $('#'+fieldname).after(firstError);
                });
                e_msg = gettext("Please check the above errors");
                $('#emsg').text( e_msg ).fadeIn('slow');
            } else {
            console.log(jqXHR.responseText);
            }
        },
    });
}

$(document).ready(function() {
    $(document).on('click', '#edit_user', function() {
        var form_data = {};
        form_data['user'] = {};
        form_data['user']['username'] = $('#username').val();
        form_data['user']['first_name'] = $('#first_name').val();
        form_data['user']['last_name'] = $('#last_name').val();
        form_data['profile'] = {};
        form_data['profile']['about'] = $('#profile_about').val();
        // Some of these form data are for the user model, others for the user profile model,
        // so we pack it all up in a json package (form_data) and unpack it on the server.
        post_data = {};
        post_data['form_data'] = JSON.stringify(form_data);  
        post_data['csrfmiddlewaretoken'] = $('input[name="csrfmiddlewaretoken"]').val()
        editUser(post_data);
    });



});