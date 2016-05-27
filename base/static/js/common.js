/** Extend jQuery for common functions
 * @namespace jQuery
 */
jQuery.extend({
    /** Specifies whether a dropdown box is opened. Only supports one dropdown box per page.
     * @memberof jQuery
     */
    'isDropdownBoxOpen': false,
    /** Creates a dropdown box.
     * @param btn The button to open and close the dropdown box.
     * @param box The node containing the contents of the dropdown box.
     * @memberof jQuery
     */
    'addDropdownBox': function(btn, box) {
        btn.bind('mousedown', function(e) {
            e.preventDefault();
            if(btn.hasClass('disabled')) {
                return;
            }
            if('none' == box.css('display')) {
                $.openDropdownBox(box);
            }
        });
    },
    /** Opens a dropdown box.
     * @param box The node containing the contents of the dropdown box.
     * @memberof jQuery
     */
    'openDropdownBox': function(box) {
        box.show();
        window.setTimeout(function() {
            jQuery(document).on('mousedown', {'box': box}, $.closeDropdownBox);
        }, 100);
        $.isDropdownBoxOpen = true;
    },
    /** Closes a dropdown box
     * @memberof jQuery
     * @param e ?
     */
    'closeDropdownBox': function(e) {
        e.preventDefault();
        jQuery(document).off('mousedown', $.closeDropdownBox);
        //if(e.data.box.hasOwnProperty('type'))
        //    e.data.box = box.data.box;
        e.data.box.hide();
        $.isDropdownBoxOpen = false;
    },
    /** Checkes or uncheckes a checkable label. This is used for example for bibliography categories when editing bibliography items.
     * @memberof jQuery
     * @param label The node who's parent has to be checked or unchecked.
     */
    'setCheckableLabel': function(label) {
        var checkbox = label.parent().find('input[type=checkbox]');
        if(label.hasClass('checked')) {
            label.removeClass('checked');
        } else {
            label.addClass('checked');
        }
    },
    /** Cover the page signaling to the user to wait.
     * @memberof jQuery
     */
    'activateWait': function() {
        jQuery('#wait').addClass('active');
    },
    /** Remove the wait cover.
     * @memberof jQuery
     */
    'deactivateWait': function() {
        jQuery('#wait').removeClass('active');
    },
    /** Show a message to the user.
     * @memberof jQuery
     * @param alert_type The type of message that is shown (error, warning, info or success).
     * @param alert_msg The message text.
     */
    'addAlert': function(alert_type, alert_msg) {
        var fade_speed = 300;
        var icon_names = {
            'error': 'icon-attention-circle',
            'warning': 'icon-attention-circle',
            'info': 'icon-info-circle',
            'success': 'icon-ok'
        };
        var $alert_box = jQuery('<li class="alerts-' + alert_type + ' ' + icon_names[alert_type] + '">' + alert_msg + '</li>');
        if(0 === jQuery('#alerts-outer-wrapper').size())
            jQuery('body').append('<div id="alerts-outer-wrapper"><ul id="alerts-wrapper"></ul></div>');
        jQuery('#alerts-wrapper').append($alert_box);
        $alert_box.fadeTo(fade_speed, 1, function() {
            jQuery(this).delay('2000').fadeOut(fade_speed, function() { jQuery(this).remove(); });
        });
    },
    /** Turn milliseconds since epoch (UTC) into a local date string.
     * @memberof jQuery
     * @param {number} milliseconds Number of milliseconds since epoch (1/1/1970 midnight, UTC).
     * @param {boolean} sortable Whether the result should appear in a date only list.
     */
    'localizeDate': function (milliseconds, sortable) {
        milliseconds = parseInt(milliseconds);
        if (milliseconds > 0) {
            var the_date = new Date(milliseconds);
            if (true === sortable) {
                var yyyy = the_date.getFullYear(),
                    mm = the_date.getMonth() + 1,
                    dd = the_date.getDate();

                if (10 > mm) {
                    mm = '0' + mm;
                }

                return yyyy + '/' + mm + '/' + dd;
            }
            else {
                return the_date.toLocaleString();
            }
        }
        else {
            return '';
        }
    },
});

/** Things that need to happen whenever the window resizes */
var resizeNow = function() {
    var wh = jQuery(window).height();
    var document_table = jQuery('.fw-table-wrapper .fw-document-table-body');
    if(0 < document_table.size()) {
        document_table.css('height', wh - 320);
    }
};


jQuery(document).ready(function () {
    jQuery(window).resize(resizeNow);
    resizeNow();
});
