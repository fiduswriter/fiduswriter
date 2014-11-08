/**
 * @file Functions related to the chat system.
 * @copyright This file is part of <a href='http://www.fiduswriter.org'>Fidus Writer</a>.
 *
 * Copyright (C) 2014 Johannes Wilm.
 *
 * @license This program is free software: you can redistribute it and/or modify
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
 * along with this program.  If not, see <a href='http://www.gnu.org/licenses'>http://www.gnu.org/licenses</a>.
 *
 */
(function () {
    var exports = this,
   /**
  * Functions for chat between users who access a document simultaneously. TODO
  * @namespace chatHelpers
  */
        toolbarTemplates = {};

    toolbarTemplates.linkDialog = _.template('\
        <div title="<%= gettext("Link") %>">\
            <p><input class="linktext" type="text" value="<%- linkText %>" placeholder="<%= gettext("Link text (optional") %>"/></p>\
            <p><input class="link" type="text" value="<%- link  %>" placeholder="<%=  gettext("Link") %>"/></p>\
        </div>\
    ');

    exports.toolbarTemplates = toolbarTemplates;

}).call(this);
