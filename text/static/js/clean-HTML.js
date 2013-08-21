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

(function () {
        var exports = this,
            cleanHTML = {};


        var allowedHTML = {
            'P': true,
            'BR': true,
            'H1': true,
            'H2': true,
            'H3': true,
            'I': true,
            'B': true,
            'A': true,
            'LI': true,
            'UL': true,
            'OL': true,
            'FIGURE': true,
            'FIGCAPTION': true,
            'BLOCKQUOTE': true,
            'CODE': true,
        };

        var topBlockElements = {
            'P': true,
            'H1': true,
            'H2': true,
            'H3': true,
            'H4': true,
            'H5': true,
            'H6': true,
            'UL': true,
            'OL': true,
            'FIGURE': true,
            'DIV': true,
            'PRE': true,
            'BLOCKQUOTE': true,
            'CODE': true,
        };

        var allowedAttributes = {
            'href': true,
        };

        cleanHTML.ignoreAboveBlocks = function (node) {
            if (!node.classList.contains('clean-container')) {
                node.classList.add('clean-ignore');
                cleanHTML.ignoreAboveBlocks(node.parentNode);
            }
        };
        
        
        cleanHTML.footnoteInOutput = false;

        cleanHTML.cleanChildNode = function (node) {
            var newNode, i, fragment, referenceNode;

            if (node.nodeName != '#text') {
                if ((node.nodeName === 'SPAN' && node.classList.contains(
                            'citation')) ||
                    (node.nodeName === 'SPAN' && node.classList.contains(
                            'equation')) ||
                    (node.nodeName === 'SPAN' && node.classList.contains(
                            'figure-equation'))) { // We are dealing with an element known to us, so let it go.
                    node.removeAttribute('style');
                } else if (node.nodeName === 'SPAN' && node.classList.contains(
                        'pagination-footnote') || node.nodeName === 'A' && node.classList.contains('sdfootnoteanc')) {
                    newNode = document.createElement('span');
                    newNode.appendChild(document.createElement('span'));
                    newNode.id = pagination.createRandomId(
                        'pagination-footnote-');
                    newNode.classList.add('pagination-footnote');
                    
                    node.parentNode.replaceChild(newNode, node);
                    
                    cleanHTML.footnoteInOutput = true;
                
                    
                    if (node.nodeName === 'A') {
                        // This is a footnote from a word processor. It is only a reference to the footnote, so set everything for finding the contents later on.
                        newNode.firstChild.appendChild(document.createElement('span'));
                        newNode.firstChild.firstChild.innerHTML = node.innerHTML;
                    } else {
                        node.removeAttribute('style');
                        node.removeAttribute('class');
                        node.removeAttribute('id');
                        newNode.firstChild.appendChild(node);
                    }
                } else if (node.nodeName === 'P' && node.classList.contains('sdfootnote') & node.hasAttribute('data-footnote-id')) {
 
                    referenceNode = jQuery(node).closest('.clean-container').find('a[name=sdfootnote'+node.getAttribute('data-footnote-id')+'anc]')[0];
                    if (referenceNode) {
                        //node.removeChild(node.firstChild);
                        referenceNode.innerHTML = node.innerHTML;
                        node.parentNode.removeChild(node);
                    }
                } else if (node.nodeName === 'A' && node.classList.contains('sdfootnotesym')) {
                    node.parentNode.classList.add('sdfootnote');
                    node.parentNode.setAttribute('data-footnote-id',node.innerText);
                    node.parentNode.removeChild(node);
                } else if (node.classList && node.classList.contains('Apple-interchange-newline')) { // Webkit places a BR at the end of certain text pasages when they are copied. We remove this.
                    node.parentNode.removeChild(node);
                } else if (node.nodeName in allowedHTML && (!node.classList.contains('clean-ignore'))) {
                    if (node.nodeName in topBlockElements) {
                        if (jQuery(node).closest('li').length > 0) {
                            fragment = document.createDocumentFragment();
                            while (node.firstChild) {
                                fragment.appendChild(node.firstChild);
                            }
                            node.parentNode.replaceChild(fragment, node);
                        } else {
                            cleanHTML.ignoreAboveBlocks(node.parentNode);
                        }
                    }
                    for (i = node.attributes.length - 1; i > -1; i--) {
                        var attributeName = node.attributes[i].name;
                        if (!(attributeName in allowedAttributes)) {
                            node.removeAttribute(attributeName);
                        }
                    }
                } else if (node.nodeName in topBlockElements && (!node.classList.contains('clean-ignore'))) {
                    cleanHTML.ignoreAboveBlocks(node.parentNode);

                    newNode = document.createElement('p');
                    while (node.firstChild) {
                        newNode.appendChild(node.firstChild);
                    }
                    node.parentNode.replaceChild(newNode, node);
                } else if (node.nodeName === 'STYLE' || node.nodeName === 'SCRIPT') {
                    node.parentNode.removeChild(node);
                }
             else {
                fragment = document.createDocumentFragment();
                while (node.firstChild) {
                    fragment.appendChild(node.firstChild);
                }
                node.parentNode.replaceChild(fragment, node);
            }
        }
    };

    cleanHTML.loop = function (node) {
        for (var i = node.childNodes.length - 1; i > -1; i--) {
            cleanHTML.loop(node.childNodes[i]);
            cleanHTML.cleanChildNode(node.childNodes[i]);
        }
        return node;
    };
    
    cleanHTML.init = function (node) {
        var blockNode = false, newNode, childNode, i;
        node.classList.add('clean-container');
        node.innerHTML = node.innerHTML.replace(/&nbsp;/g, ' '); 
        cleanHTML.loop(node);
        // Go through all nodes again. Any top node after a block node needs to be wrapped in a block node as well.
        for (i = 0; i < node.childNodes.length; i++) {
            childNode = node.childNodes[i];
            if (blockNode && !(childNode.nodeName in topBlockElements)) {
                newNode = document.createElement('p');
                node.replaceChild(newNode,childNode);
                newNode.appendChild(childNode);
            } else if (childNode.nodeName in topBlockElements) {
                blockNode = true;
            }
        }
        node.classList.remove('clean-container');
        return node;
    };

    exports.cleanHTML = cleanHTML;

}).call(this);