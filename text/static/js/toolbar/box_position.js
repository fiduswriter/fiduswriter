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

// toolbar box positioning
(function (jQuery) {
    return jQuery.widget('Fidus.toolbarleft', {
        toolbar: null,
        options: {
            parentElement: 'body',
            editable: null,
            toolbar: null
        },
        setPosition: function () {
            // This function is here merely to satisfy hallo.js requirements
        },
        _create: function () {
            var el, widthToAdd, _this = this;
            this.toolbar = this.options.toolbar;
            this.toolbar.show();
            jQuery(this.options.parentElement).append(this.toolbar);
            this._bindEvents();
            jQuery(window).resize(function (event) {
                return _this._updatePosition();
            });
            this._updatePosition();
        },
        _updatePosition: function () {
            return false;
        },
        _bindEvents: function () {
            var _this = this;
            this.element.bind('halloactivated', function (event, data) {
                //_this._updatePosition(_this._getPosition(event));
                //return _this.toolbar.show();
            });
            return this.element.bind('hallodeactivated', function (event, data) {
                //return _this.toolbar.hide();
                jQuery('.ui-state-active').removeClass('ui-state-active');
            });
        },
    });
})(jQuery);