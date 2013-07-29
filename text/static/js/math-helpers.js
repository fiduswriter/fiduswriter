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

(function () {
    var exports = this,
        mathHelpers = {};

    mathHelpers.setMathNodeContents = function(node) {
        // Set the innerText of a mathnode to be the same as the data-equation attribute
        node.innerText = '[MATH]'+ node.getAttribute('data-equation') +'[/MATH]';
    };
    
    mathHelpers.layoutMathNode = function(node) {
        // Layout a single math node
        mathHelpers.setMathNodeContents(node);
        MathJax.Hub.Queue(["Typeset",MathJax.Hub, node],[mathHelpers.saveMathjaxElements]);
    };
    
    mathHelpers.resetMath = function(callback) {
        // (Re)layout all math nodes
        var allEquations = jQuery('span.equation'), mathjax, i;
        /*if (allEquations.length===0) {
            mathjax = document.getElementById('MathJax_SVG_Hidden');
            if (mathjax) {
                // There are no equations, so we remove the mathjax element.
                mathjax.parentNode.parentNode.removeChild(mathjax.parentNode);
            }
        }*/
        for (i = 0; i < allEquations.length; i++) {
            mathHelpers.setMathNodeContents(allEquations[i]);
        }
        MathJax.Hub.Queue(["Typeset",MathJax.Hub],[callback]);
        
    };
    
    mathHelpers.saveMathjaxElements = function () {
        var mathjaxDefs, mathjax, changed = false;
        
        mathjax = document.getElementById('MathJax_SVG_Hidden');
        
            if ((mathjax && (theDocument.settings.mathjax !== mathjax.parentNode.outerHTML)) ||
                (!mathjax && theDocument.settings.mathjax)
            ) {
                changed = true;
            }
        
            if (mathjax) {
                theDocument.settings.mathjax = mathjax.parentNode.outerHTML;
            } else {
                theDocument.settings.mathjax = false;
            }
        
            if (changed) {
                editorHelpers.documentHasChanged();
            }
        
    };
    
    
    mathHelpers.bindEvents = function(openDialog) {
        jQuery(document).on('click', '.equation', function () {
            if (jQuery(this).closest('.del')[0]) {
                // Inside a deletion node
                return true;
            }
            openDialog(this);
        });
    };
  
    exports.mathHelpers = mathHelpers;
    
}).call(this);