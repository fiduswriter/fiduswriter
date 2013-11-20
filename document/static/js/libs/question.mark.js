/*
 * QuestionMark.js
 * Fork from: http://impressivewebs.github.io/QuestionMark.js/ by Louis Lazaris
 *
 * This is an adaptation for Fidus Writer http://fiduswriter.org
 * by Gabriel Lopez <gabriel.marcos.lopez@gmail.com>
 * License: Creative Common 2.0
 * http://creativecommons.org/licenses/by/2.0/
 *
 * Usage: $().showShortcuts()
 */
$.fn.extend({
    showShortcuts: function () {

        var diaButtons = {};
        diaButtons[gettext("Close")] = function () {
            jQuery(this).dialog("close");
        };
        jQuery(tmp_shortcuts()).dialog({
            autoOpen: true,
            height: 500,
            width: 800,
            modal: true,
            buttons: diaButtons,
            create: function () {
                var $the_dialog = jQuery(this).closest(".ui-dialog");
                $the_dialog.find(".ui-button:first-child").addClass(
                    "fw-button fw-dark");
                $the_dialog.find(".ui-button:last").addClass(
                    "fw-button fw-orange");
            },
        });

    }
});