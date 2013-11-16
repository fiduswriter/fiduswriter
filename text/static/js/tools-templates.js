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

var tmp_tools_word_counter = _.template('<div id="word-counter-dialog" title="<%- dialogHeader %>">\
        <table class="fw-document-table no-fix-layout">\
            <thead class="fw-document-table-header"><tr>\
                <th>'
                    + gettext("Number of") +
                '</th>\
                <th>'
                    + gettext("Document") +
                '</th>\
            </tr></thead>\
            <tbody class="fw-word-counter-tbody">\
                <tr>\
                    <td>' + gettext('Pages') + '</td>\
                    <td><%= pages %></td>\
                </tr>\
                <tr>\
                    <td>' + gettext('Words') + '</td>\
                    <td><%= words %></td>\
                </tr>\
                <tr>\
                    <td>' + gettext('Characters without blanks') + '</td>\
                    <td><%= chars_no_space %></td>\
                </tr>\
                <tr>\
                    <td>' + gettext('Characters with blanks') + '</td>\
                    <td><%= chars %></td>\
                </tr>\
            </tbody>\
        </table>\
    </div>');
