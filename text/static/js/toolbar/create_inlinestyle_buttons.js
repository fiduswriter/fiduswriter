/**
 * This file is part of Fidus Writer <http://www.fiduswriter.com>
 *
 * Copyright (C) 2013 Takuto Kojima, Johannes Wilm
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

// creating buttons for inlinestyles
(function (jQuery) {
    return jQuery.widget("Fidus.inlinestylebutton", {
        options: {},
        addTools: function (toolbar) {
            var buttonize, buttonset, enabled, format, widget, _ref, _this = this;
            widget = this;
            buttonset = $.Fidus.buttonset.prototype.createButtonset.call(this, widget.widgetName, 1);
            buttonize = function (format) {
                var buttonElement = jQuery('<button></button>');
                buttonElement.makebutton({
                    label: format,
                    editable: _this.options.editable,
                    command: format,
                    uuid: _this.options.uuid,
                    cssClass: _this.options.buttonCssClass
                });
                buttonElement.attr('class', 'fw-button fw-light fw-large fw-square');
                buttonset.append(buttonElement);
            };
            _ref = this.options.formattings;
            for (format in _ref) {
                enabled = _ref[format];
                if (enabled) {
                    buttonize(format);
                }
            }
            buttonset.hallobuttonset();
            return toolbar.append(buttonset);
        },
    });
})(jQuery);