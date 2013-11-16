/**
 * @license This file is part of Fidus Writer <http://www.fiduswriter.org>
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

//Make buttons
(function (jQuery) {
    jQuery.widget('Fidus.makebutton', {
        button: null,
        isChecked: false,
        options: {
            uuid: '',
            label: null,
            icon: null,
            editable: null,
            command: null,
            queryState: true,
            cssClass: null
        },
        _create: function () {
            var hoverclass, id, _base, _ref, _this = this;
            if ((_ref = (_base = this.options).icon) == null) {
                _base.icon = "icon-" + (this.options.label.toLowerCase());
            }
            id = "" + this.options.uuid + "-" + this.options.label;
            this._createButton(id, this.options.command, this.options.label, this.options.icon);
            if (this.options.cssClass) {
                this.element.addClass(this.options.cssClass);
            }
            if (this.options.editable.options.touchScreen) {
                this.element.addClass('btn-large');
            }
            this.element.data('hallo-command', this.options.command);
            hoverclass = 'button-hover';
            this.element.bind('mouseenter', function (event) {
                if (_this.isEnabled()) {
                    return _this.element.addClass(hoverclass);
                }
            });
            return this.element.bind('mouseleave', function (event) {
                return _this.element.removeClass(hoverclass);
            });
        },
        _init: function () {
            var editableElement, queryState,
            _this = this;
            queryState = function (event) {
                if (!_this.options.command) {
                    return;
                }
                try {
                    return _this.checked(document.queryCommandState(_this.options.command));
                } catch (e) {

                }
            };
            if (this.options.command) {
                this.element.bind('click', function (event) {
                    _this.options.editable.execute(_this.options.command);
                    queryState;

                    return false;
                });
            }
            if (!this.options.queryState) {
                return;
            }
            editableElement = this.options.editable.element;
            editableElement.bind('keyup paste change mouseup hallomodified', function () {
                queryState();
            });
            editableElement.bind('halloenabled', function () {
                return editableElement.bind('keyup paste change mouseup hallomodified', queryState);
            });
            return editableElement.bind('hallodisabled', function () {
                return editableElement.unbind('keyup paste change mouseup hallomodified', queryState);
            });
        },
        enable: function () {
            return this.element.removeAttr('disabled');
        },
        disable: function () {
            return this.element.attr('disabled', 'true');
        },
        isEnabled: function () {
            return this.element.attr('disabled') !== 'true';
        },
        refresh: function () {
            if (this.isChecked) {
                return this.element.addClass('ui-state-active');
            } else {
                return this.element.removeClass('ui-state-active');
            }
        },
        checked: function (checked) {
            this.isChecked = checked;
            return this.refresh();
        },
        _createButton: function (id, command, label, icon) {
            this.element.attr({
                'class': "ui-button " + command + "_button",
                'for': id,
                'title': label
            });
            this.element.append(jQuery("<span class=\"ui-button-text\"><i class=\"" + icon + "\"></i></span>"));
        }
    });
})(jQuery);