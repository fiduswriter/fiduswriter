/**
 * This file is part of Fidus Writer <http://www.fiduswriter.org>
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

//extend jQuery for common functions
jQuery.extend({
    'isDropdownBoxOpen': false,
    'addDropdownBox': function(btn, box) {
        btn.bind('click', function() {
            //console.log(box.css('display'));
            if('none' == box.css('display')) {
                $.openDropdownBox(box);
            }
        });
    },
    'openDropdownBox': function(box) {
      //  if($.isDropdownBoxOpen)
       //     return false;
        box.show();
        setTimeout(function() {
            $(document).on('click', {'box': box}, $.closeDropdownBox);
        }, 100);
        $.isDropdownBoxOpen = true;
    },
    'closeDropdownBox': function(e) {
        $(document).off('click', $.closeDropdownBox);
        if(e.data.box.hasOwnProperty('type'))
            e.data.box = box.data.box;
        e.data.box.hide();
        $.isDropdownBoxOpen = false;
    },
    'setCheckableLabel': function(label) {
        checkbox = label.parent().find('input[type=checkbox]');
        if(label.hasClass('checked')) {
            label.removeClass('checked');
            //checkbox.attr('checked', true);
        } else {
            label.addClass('checked');
            //checkbox.attr('checked', false);
        }
    },
    'activateWait': function() {
        $('#wait').addClass('active');
    },
    'deactivateWait': function() {
        $('#wait').removeClass('active');
    },
    'addAlert': function(alert_type, alert_msg) {
        var fade_speed = 300;
        var icon_names = {
            'error': 'icon-attention-circle',
            'warning': 'icon-attention-circle',
            'info': 'icon-info-circle',
            'success': 'icon-ok'
        };
        var $alert_box = $('<li class="alerts-' + alert_type + ' ' + icon_names[alert_type] + '">' + alert_msg + '</li>');
        if(0 == $('#alerts-wrapper').size())
            $('body').append('<ul id="alerts-wrapper"></ul>');
        $('#alerts-wrapper').prepend($alert_box);
        $alert_box.fadeTo(fade_speed, 1, function() {
            $(this).delay('2000').fadeOut(fade_speed, function() { $(this).remove(); });
        });
    }
});

$(document).ready(function () {
    var resizenow = function() {
        var wh = $(window).height();
        var document_table = $('.fw-table-wrapper .fw-document-table-body');
        if(0 < document_table.size()) {
            document_table.css('height', wh - 320);
        }
    }

    $(window).resize(resizenow);
    resizenow();
});
