/**
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
         mutations = {};

     mutations.checkNodes = function (node) {
         var i, childNodeCheck, citations = false,
             equations = false;
         if (node.nodeType !== 3) {
             for (i = 0; i < node.childNodes.length; i++) {
                 childNodeCheck = mutations.checkNodes(node.childNodes[i]);
                 if (childNodeCheck['citations']) {
                     citations = true;
                 }
                 if (childNodeCheck['equations']) {
                     equations = true;
                 }
             };
             if (node.tagName.toLowerCase() ===
                 "span" && node.classList
                 .contains('citation')) {
                 citations = true;
             }
             if (node.tagName.toLowerCase() ===
                 "span" && node.classList
                 .contains('equation')) {
                 equations = true;
             }
         }
         return {
             citations: citations,
             equations: equations
         };
     };


     mutations.handler = function (mutationRecords) {
         var layoutEquationsNeeded = false,
             layoutCitationsNeeded = false,
             checkNodes, i, j;

         for (i = 0; i < mutationRecords.length; i++) {

             if (mutationRecords[i].type === "childList") {
                 for (j = 0; j < mutationRecords[i].removedNodes.length; j++) {

                     checkNodes = mutations.checkNodes(mutationRecords[i].removedNodes[
                         j]);

                     if (!layoutEquationsNeeded) {
                         layoutEquationsNeeded = checkNodes['equations'];
                     }
                     if (!layoutCitationsNeeded) {
                         layoutCitationsNeeded = checkNodes['citations'];
                     }
                 }
                 /* TODO: This is disabled for now. Adding of new instances of equations and citations is handled manually -- 
                  * no need to redo the entire document. This is mainly done for timing reasons, but it is uncertain whether timing 
                  * is actually relevant. If it is not, this would be a cleaner way to do it.
                 for (j=0;j<mutationRecords[i].addedNodes.length;j++) {
                     checkNodes = mutations.checkNodes(
                         mutationRecords[i].addedNodes[j]);

                     if (!layoutEquationsNeeded) {
                         layoutEquationsNeeded = checkNodes['equations'];
                     }
                     if (!layoutCitationsNeeded) {
                         layoutCitationsNeeded = checkNodes['citations'];
                     }

                 }
*/
             }
         }


         if (layoutCitationsNeeded) {
             //console.log('mutations.js');
             citationHelpers.formatCitationsInDoc();
         }
         if (layoutEquationsNeeded) {
             mathHelpers.resetMath(mathHelpers.saveMathjaxElements);
         }

     };

     mutations.bind = function (editableArea) {
         var mutationConfig = {
             attributes: true,
             subtree: true,
             characterData: true,
             childList: true
         },
             observer = new MutationObserver(mutations.handler);

         observer.observe(editableArea, mutationConfig);

     };

     exports.mutations = mutations;

 }).call(this);