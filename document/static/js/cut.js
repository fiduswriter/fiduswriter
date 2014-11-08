/**
 * @file Functions to deal with copy and paste.
 * @copyright This file is part of <a href='http://www.fiduswriter.org'>Fidus Writer</a>.
 *
 * Copyright (C) 2013 Takuto Kojima, Johannes Wilm.
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
  * Functions related to cutting from the editor. TODO
  * @namespace cut
  */
        cut = {};

    cut.waitForCut = function (elem, oldString) { //IE/Firefox/Webkit
        if (oldString != elem.innerHTML) {

        } else {

            var that = {
                e: elem,
                o: oldString,
            }
            that.callself = function () {
                cut.waitForCut(that.e, that.o)
            }
            setTimeout(that.callself, 20);
        }

    };

    cut.notRecentlyCut = true; // prevent double cutting by checking whether cut has been done recently

    cut.handleCut = function (e) {
        if (cut.notRecentlyCut) {
            cut.notRecentlyCut = false;
            var oldString = this.innerHTML;
            cut.waitForCut(this, oldString);
            setTimeout(function () {
                cut.notRecentlyCut = true;
            }, 1000)
        }
        return false;
    };

    exports.cut = cut;

}).call(this);
