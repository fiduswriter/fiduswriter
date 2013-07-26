$(document).ready(function(){
    $('.checker').bind('click',function() {
        if ($('#terms-check').is(':checked') && $('#beta-check').is(':checked')) {
            $('#submit').removeAttr("disabled");
        } else {
            $('#submit').attr("disabled", "disabled");
        }
    });
    $('#submit').bind('click',function() {
        alert(gettext('Thanks for verifying! You can now log in to Fidus Writer.'));
    });
});
