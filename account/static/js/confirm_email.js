jQuery(document).ready(function(){
    jQuery('.checker').bind('click',function() {
        var testCheck = false;
        if (jQuery('#test-check').length > 0) {
            if (jQuery('#test-check').is(':checked')) {
                testCheck = true;
            }
        } else {
            testCheck = true;
        }
        if (testCheck && jQuery('#terms-check').is(':checked')) {
            jQuery('#submit').removeAttr("disabled");
        } else {
            jQuery('#submit').attr("disabled", "disabled");
        }
    });
    jQuery('#submit').bind('click',function() {
        alert(gettext('Thanks for verifying! You can now log in.'));
    });
});
