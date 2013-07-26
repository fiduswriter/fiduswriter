/*
Client side handling of locking for the ModelAdmin change page.

Only works on change-form pages, not for inline edits in the list view.
*/

// Make sure jQuery is available.
if (typeof jQuery === 'undefined') { 
    jQuery = django.jQuery;
}

// Set the namespace.
var locking = locking || {};

// Begin wrap.
(function($, locking) {
        
// Global error function that redirects to the frontpage if something bad
// happens.
locking.error = function() {
    return;
    var text = ('An unexpected locking error occured. You will be' +
        ' forwarded to a safe place. Sorry!'
    );
    // Catch if gettext has not been included.
    try {
        alert(gettext(text));
    } catch(err) {
        alert(text);
    }
    window.location = '/';
};

/*
Delays execution of function calls with support for events that pauses the 
script, like the use of alert().

Takes an array of arrays, each consisting of first the function to be delayed
and second the delay in seconds. Must be ordered after delays descending.

This is a one trick pony and must only be called once or bad things happens.
*/
locking.delay_execution = function(funcs) {
    var self = this;
    var begin_time = new Date().getTime();
    var execute = function() {
        var current_time = new Date().getTime();
        var delay = funcs[0][1];
        if ((current_time-begin_time) / 1000 > delay) {
            funcs[0][0]();
            funcs.shift();
            if (funcs.length === 0) clearInterval(self.interval_id);
        }
    };
    this.interval_id = setInterval(execute, 200);
    execute();
};

function unlock_click_event(base_url){
    //Locking toggle function
    $("a.lock-status").click(function(){
        console.log('this', $(this).attr('title'))
        user = $.trim($(this).text());
        id = $(this).attr('id');
        if ($(this).hasClass("locked")){
            if (confirm("User '" + user + "' is currently editing this " + 
                        "content. Proceed with removing the lock?")) {
                $.ajax({'url': base_url + id + "/unlock/", 'async': false});
                $(this).hide();
                //$(this).toggleClass('unlocked');
            }
        }
        return false;
    });
}

// Handles locking on the contrib.admin edit page.
locking.admin = function() {
    // Needs a try/catch here as well because exceptions does not propagate 
    // outside the onready call.
    try {
        settings = locking;
        // Get url parts.
        var adm_url = settings.admin_url;
        var pathname = window.location.pathname;
        if (pathname.indexOf(adm_url) == 0 && adm_url.length > 0) {
            var app = $.url.segment(1);
            var model = $.url.segment(2);
            var id = $.url.segment(3);
        } else {
            var app = $.url.segment(0);
            var model = $.url.segment(1);
            var id = $.url.segment(2);
        }
        var base_url = settings.base_url + "/" + [app, model, id].join("/");
        unlock_click_event(base_url);
        
        // Don't lock page if not on change-form page.
        if (!($("body").hasClass("change-form"))) return;
        
        var is_adding_content = function() {
            return ($.url.segment(3) === 'add' || // On a standard add page.
                    // On a add page handled by the ajax_select app.
                    $.url.segment(0) === 'ajax_select')
        };
        // Don't apply locking when adding content.
        if (is_adding_content()) return;
        
        
        // Urls.
        var base_url = settings.base_url + "/" + [app, model, id].join("/");
        var urls = {
            is_locked: base_url + "/is_locked/",
            lock: base_url + "/lock/",
            unlock: base_url + "/unlock/"
        };
        // Texts.
        var text = {
            warn: gettext('Your lock on this page expires in less than %s' +
                ' minutes. Press save or <a href=".">reload the page</a>.'),
            is_locked: gettext('This page is locked by <em>%(for_user)s' + 
                '</em> and editing is disabled.'),
            has_expired: gettext('Your lock on this page is expired!' + 
                ' If you save now, your attempts may be thwarted due to another lock,' +
                ' or even worse, you may have stale data.'
            ),
            prompt_to_save: 'Do you wish to save the page?',
        };
        
        // Creates empty div in top of page.
        var create_notification_area = function() {
            $("#content-main").prepend(
                '<div id="locking_notification"></div>');
        };
        
        // Scrolls to the top, updates content of notification area and fades
        // it in.
        var update_notification_area = function(content, func) {
            $('html, body').scrollTop(0);
            $("#content-main #locking_notification").html(content).hide()
                                                    .fadeIn('slow', func);
        };
        
        // Displays a warning that the page is about to expire.
        var display_warning = function() {
            var promt_to_save = function() {
                if (confirm(text.prompt_to_save)) {
                    $('form input[type=submit][name=_continue]').click();
                }
            }
            var minutes = Math.round((settings.time_until_expiration - 
                settings.time_until_warning) / 60);
            if (minutes < 1) minutes = 1;
            update_notification_area(interpolate(text.warn, [minutes]), 
                                     promt_to_save);
        };
        
        // Displays notice on top of page that the page is locked by someone 
        // else.
        var display_islocked = function(data) {
            update_notification_area(interpolate(text.is_locked, data, true));
        };
        
        // Disables all form elements.
        var disable_form = function() {
            $(":input[disabled]").addClass('_locking_initially_disabled');
            $(":input").attr("disabled", "disabled");
        };
        
        // Enables all form elements that was not disabled from the start.
        var enable_form = function() {
            $(":input").not('._locking_initially_disabled')
                       .removeAttr("disabled");
        };
        
        // The user did not save in time, expire the page.
        var expire_page = function() {
            update_notification_area(text.has_expired);
        };
        
        // Request a lock on the page, and unlocks page when the user leaves.
        // Adds delayed execution of user notifications.
        var lock_page = function() {
            var request_lock = function() {
                var parse_request_lock_responce = function(jqXHR, textStatus) {
                    // TODO: It seems ugly to use response codes like this, it
                    // should be allowed (i.e. not 403) to ask if an object is
                    // locked. Return a json object instead. 
                    if (jqXHR.status === 403) {
                        display_islocked();
                        return;
                    } else if (jqXHR.status === 200) {
                        enable_form();
                        locking.delay_execution([
                            [display_warning, settings.time_until_warning], 
                            [expire_page, settings.time_until_expiration]
                        ]);
                    } else {
                        locking.error();
                    }
                };
                $.ajax({
                    url: urls.lock,
                    complete: parse_request_lock_responce,
                    cache: false
                });
            };
            var request_unlock = function() {
                // We have to assure that our unlock request actually gets
                // through before the user leaves the page, so it shouldn't
                // run asynchronously.
                $.ajax({
                    url: urls.unlock,
                    async: false,
                    cache: false
                });
            };
            request_lock();
            $(window).unload(request_unlock);
        };
        
        // The server gave us locking info. Either lock or keep it unlocked
        // while showing notification.
        var parse_succesful_request = function(data, textStatus, jqXHR) {
            if (!data.applies) {
                lock_page();
            } else {
                display_islocked(data);
            }
        };
        
        // Polls server for the page lock status.
        var request_locking_info = function() {
            $.ajax({
                url: urls.is_locked,
                success: parse_succesful_request,
                error: locking.error,
                cache: false
            });
        };
        
        // Initialize.
        disable_form();
        create_notification_area();
        request_locking_info();
        
    } catch(err) {
        locking.error();
    }
};

// Catches any error and redirects to a safe place if any.
try {
    $(locking.admin);
} catch(err) {
    locking.error();
}

// End wrap.
})(jQuery, locking);
