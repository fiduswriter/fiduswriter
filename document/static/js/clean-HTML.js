/**
 * @file Functions realted to cleaning HTML after paste.
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
var cleanHTML = function(element) {
    /** Clean HTML to only keep HTML entities that are in use by Fidus Writer.
     */

    var that = this;
    this.element = element;
    this.footnotes = false;


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

    var cleanContainerElements = { // Elements with sepcific cleanign instructions
        'A': function(node) {
            if (node.classList.contains('sdfootnoteanc')) {
                /* This is a wordprocessor footnote. Create a new footnote
                We need to turn it from:
                <a class="sdfootnoteanc">...contents...</a>
                into:
                <span class="pagination-footnote"><span><span>...contents...</span></span></span>
                */
                var newNode = document.createElement('span');
                newNode.appendChild(document.createElement('span'));
                newNode.id = pagination.createRandomId(
                    'pagination-footnote-');
                newNode.classList.add('pagination-footnote');

                newNode.firstChild.appendChild(document.createElement('span'));

                while (node.firstChild) {
                    newNode.firstChild.firstChild.appendChild(node.firstChild);
                }

                node.parentNode.replaceChild(newNode, node);

                that.footnotes = true;

                // Now loop through the inner parts of the footnote node.
                that.loop(node.firstChild.firstChild);
            } else {
                // We create a new link, only copying the href and textContent of the old link in order to lose all other attributes;
                var textContent = node.textContent,
                    link = node.getAttribute('href'),
                    newLinkNode = document.createElement('a');
                if (textContent.length > 0) {
                    newLinkNode.textContent = textContent;
                    newLinkNode.setAttribute('href', link);
                    node.parentNode.replaceChild(newLinkNode, node);
                } else {
                    // Link node with no text, remove it.
                    node.parentNode.removeChild(node);
                }
            }
        },
        'SPAN': function(node) {
            var newNode;
            if ((node.classList.contains(
                    'citation')) ||
                (node.classList.contains(
                    'equation')) ||
                (node.classList.contains(
                    'figure-equation'))) {
                /* We are likely dealing with an element known to us, so we only remove any potential styling attribute.
                TODO: better cleanup. */
                node.removeAttribute('style');
            } else if (node.classList.contains(
                    'pagination-footnote')) {
                /* This is a Fidus Writer footnote with the structure <span class="pagination-footnote"><span><span>...content...</span></span></span>.
                We recreate the three outer spans to make sure they have no extra attributes.
                */
                if (node.firstChild && node.firstChild.firstChild) {
                    newNode = document.createElement('span');

                    newNode.id = pagination.createRandomId(
                        'pagination-footnote-');
                    newNode.classList.add('pagination-footnote');

                    newNode.appendChild(document.createElement('span'));
                    newNode.firstChild.appendChild(document.createElement('span'));

                    while (node.firstChild.firstChild.firstChild) {
                        newNode.firstChild.firstChild.appendChild(node.firstChild.firstChild.firstChild);
                    }
                    node.parentNode.replaceChild(newNode, node);

                    that.footnotes = true;

                    // Now loop through the inner parts of the footnote node.
                    that.loop(newNode.firstChild.firstChild);
                } else {
                    /* The node does not have the two required span child nodes.
                    Something must have gone wrong, or it just happens to have this class name but come from another app than FW.
                    We therefore delete it entirely. */
                    node.parentNode.removeChild(node);

                }

            } else {
                // The span is not of any of the known types. Clean each child node, move them to the parent node, and then delete the node itself.
                that.loop(node);

                while (node.firstChild) {
                    newNode = node.firstChild;
                    node.parentNode.insertBefore(newNode, node);
                }
                newNode = node.parentNode;
                newNode.removeChild(node);
            }
        },
        'P': function(node) {
            var newNode, referenceNode, footnoteSymbolNode, footnodeID, topBlockNode;
            if (jQuery(node).find('span.sdfootnotesym').length > 0) {
                // As we are going through the cleaning from the back to the front, we find the footnote contents before the reference to it.
                footnoteSymbolNode = jQuery(node).find('span.sdfootnotesym')[0];
                if (footnodeSymbolNode) {
                    footnodeID = footnoteSymbolNode.textContent;
                    footnodeSymbolNode.parentNode.removeChild(footnodeSymbolNode);

                    // We move the contents of this node to the reference node.
                    referenceNode = jQuery(node).closest('.clean-container').find('a[name=sdfootnote' + footnodeID + 'anc]')[0];
                }
                if (footnodeID && referenceNode) {
                    // Appending to reference node. We are not cleaning this content as the reference node will be discovered later on.
                    while (node.firstChild) {
                        referenceNode.appendChild(node.firstChild);
                    }
                    node.parentNode.removeChild(node);
                } else {
                    // The footnote is there, but not the reference to it is not or it doesn't contain a symbol we need to reference it correctly.
                    // We delete the footnote.
                    node.parentNode.removeChild(node);
                }
            } else {
                newNode = document.createElement('p');
                topBlockNode = node;
                // P-nodes should only be accepted as top level block nodes. If the P is inside of another block node, move it to the top.
                while (topBlockNode.parentNode.parentNode) {
                    topBlockNode = topBlockNode.parentNode;
                }
                topBlockNode.parentNode.insertBefore(newNode, topBlockNode);
                while (node.firstChild) {
                    newNode.appendChild(node.firstChild);
                }
                that.loop(newNode);
                node.parentNode.removeChild(node);

            }
        },
        'STYLE': function(node) {
            node.parentNode.removeChild(node);
        },
        'SCRIPT': function(node) {
            node.parentNode.removeChild(node);
        },
        'DIV': function(node) {
            // Div nodes are not accepted. Turn them into P nodes if needed.
            var topBlockNode = node, newNode = document.createElement('p');

            // convert the node into a top level P block node. If the node is inside of another block node, move it to the top.
            while (topBlockNode.parentNode.parentNode) {
                topBlockNode = topBlockNode.parentNode;
            }

            topBlockNode.parentNode.insertBefore(newNode, topBlockNode);
            while (node.firstChild) {
                newNode.appendChild(node.firstChild);
            }
            that.loop(newNode);
            node.parentNode.removeChild(node);


        },
        'H1': function(node) {

            var topBlockNode = node, newNode = document.createElement('h1');

            // If the node is inside of another block node, move it to the top.
            while (topBlockNode.parentNode.parentNode) {
                topBlockNode = topBlockNode.parentNode;
            }

            topBlockNode.parentNode.insertBefore(newNode, topBlockNode);
            while (node.firstChild) {
                newNode.appendChild(node.firstChild);
            }
            that.loop(newNode);
            node.parentNode.removeChild(node);

        },
        'H2': function(node) {

            var topBlockNode = node, newNode = document.createElement('h2');

            // If the node is inside of another block node, move it to the top.
            while (topBlockNode.parentNode.parentNode) {
                topBlockNode = topBlockNode.parentNode;
            }

            topBlockNode.parentNode.insertBefore(newNode, topBlockNode);
            while (node.firstChild) {
                newNode.appendChild(node.firstChild);
            }
            that.loop(newNode);
            node.parentNode.removeChild(node);

        },
        'H3': function(node) {

            var topBlockNode = node, newNode = document.createElement('h3');

            // If the node is inside of another block node, move it to the top.
            while (topBlockNode.parentNode.parentNode) {
                topBlockNode = topBlockNode.parentNode;
            }

            topBlockNode.parentNode.insertBefore(newNode, topBlockNode);
            while (node.firstChild) {
                newNode.appendChild(node.firstChild);
            }
            that.loop(newNode);
            node.parentNode.removeChild(node);

        },
        'H4': function(node) {
            // H4 nodes are not accepted. Turn them into P nodes if needed.
            cleanContainerElements.DIV(node);
        },
        'H5': function(node) {
            // H4 nodes are not accepted. Turn them into P nodes if needed.
            cleanContainerElements.DIV(node);
        },
        'H6': function(node) {
            // H4 nodes are not accepted. Turn them into P nodes if needed.
            cleanContainerElements.DIV(node);
        },
        'UL': function(node) {
            var newNode, topBlockNode;
            // Make sure that the UL is the topmost node and that all direct children are LI nodes
            newNode = document.createElement('UL');
            topBlockNode = node;
            // convert the node into a top level P block node. If the node is inside of another block node, move it to the top.
            while (topBlockNode.parentNode.parentNode) {
                topBlockNode = topBlockNode.parentNode;
            }
            topBlockNode.parentNode.insertBefore(newNode, topBlockNode);
            while (node.firstChild) {
                if (node.firstChild.nodeName === 'LI') {
                    newNode.appendChild(node.firstChild);
                } else {
                    node.removeChild(node.firstChild);
                }
            }
            node.parentNode.removeChild(node);
            that.loop(newNode);
        },
        'OL': function(node) {
            var newNode, topBlockNode;
            // Make sure that the UL is the topmost node and that all direct children are LI nodes
            newNode = document.createElement('OL');
            topBlockNode = node;
            // convert the node into a top level P block node. If the node is inside of another block node, move it to the top.
            while (topBlockNode.parentNode.parentNode) {
                topBlockNode = topBlockNode.parentNode;
            }
            topBlockNode.parentNode.insertBefore(newNode, topBlockNode);
            while (node.firstChild) {
                if (node.firstChild.nodeName === 'LI') {
                    newNode.appendChild(node.firstChild);
                } else {
                    node.removeChild(node.firstChild);
                }
            }
            node.parentNode.removeChild(node);
            that.loop(newNode);
        },
        'LI': function(node) {
            var newNode;
            if ((node.parentNode.nodeName==='OL'||node.parentNode.nodeName==='UL') && node.childNodes.length > 0) {
                newNode = document.createElement('li');
                node.parentNode.insertBefore(newNode, node);
                while (node.firstChild) {
                    newNode.appendChild(node.firstChild);
                }
                that.loop(newNode);
            }
            node.parentNode.removeChild(node);
        },
        'CODE': function(node) {
            var newNode = document.createElement('code'),
                topBlockNode = node;
            // CODE-nodes should only be accepted as top level block nodes. If the CODE is inside of another block node, move it to the top.
            while (topBlockNode.parentNode.parentNode) {
                topBlockNode = topBlockNode.parentNode;
            }
            topBlockNode.parentNode.insertBefore(newNode, topBlockNode);
            while (node.firstChild) {
                newNode.appendChild(node.firstChild);
            }
            node.parentNode.removeChild(node);
            that.loop(newNode);
        },
        'PRE': function(node) {
            // PRE-node is turned into CODE-node
            cleanContainerElements.CODE(node);
        },
        'BLOCKQUOTE': function(node) {
            var newNode = document.createElement('blockquote'),
                topBlockNode = node;
            // Blockquote-nodes should only be accepted as top level block nodes. If the Blockquote is inside of another block node, move it to the top.
            while (topBlockNode.parentNode.parentNode) {
                topBlockNode = topBlockNode.parentNode;
            }
            topBlockNode.parentNode.insertBefore(newNode, topBlockNode);
            while (node.firstChild) {
                newNode.appendChild(node.firstChild);
            }
            node.parentNode.removeChild(node);
            that.loop(newNode);
        },
        'FIGURE': function(node) {
            var newNode,
                topBlockNode = node;
            if (node.childNodes.length === 2 && node.childNodes[0].nodeName === 'DIV' && node.childNodes[1].nodeName === 'FIGCAPTION') {
                // We assume that this is a figure that originates in Fidus Writer.
                // TODO: Clean figcaption and div nodes!
                newNode = document.createElement('figure')
                    // FIGURE-nodes should only be accepted as top level block nodes. If the FIGURE is inside of another block node, move it to the top.
                while (topBlockNode.parentNode.parentNode) {
                    topBlockNode = topBlockNode.parentNode;
                }
                topBlockNode.parentNode.insertBefore(newNode, topBlockNode);
                while (node.firstChild) {
                    newNode.appendChild(node.firstChild);
                }
            }
            node.parentNode.removeChild(node);
        },
        'BR': function(node) {
            //if (node.classList && node.classList.contains('Apple-interchange-newline')) {
            // Webkit places a BR at the end of certain text pasages when they are copied. We remove this.
            node.parentNode.removeChild(node);
            //} else {
            //    if (['P','CODE','BLOCKQUOTE',''].indexOf(node.parentNode.nodeName) != -1)
            //}
        },
        'I': function(node) {
            var newNode = document.createElement('i');
            node.parentNode.insertBefore(newNode, node);
            while (node.firstChild) {
                newNode.appendChild(node.firstChild);
            }
            node.parentNode.removeChild(node);
            that.loop(newNode);
        },
        'B': function(node) {
            var newNode = document.createElement('b');
            node.parentNode.insertBefore(newNode, node);
            while (node.firstChild) {
                newNode.appendChild(node.firstChild);
            }
            node.parentNode.removeChild(node);
            that.loop(newNode);
        },
    };

    this.cleanChildNode = function(node) {
        var newNode;

        if (node.nodeName != '#text') {
            //node.textContent = node.textContent.trim();
        //} else {
            newNode = document.createDocumentFragment();
            while (node.firstChild) {
                newNode.appendChild(node.firstChild);
            }
            node.parentNode.replaceChild(newNode, node);
        }
    };

    this.loop = function(node) {

        var i, j, childNodes = [];
        for (i = node.childNodes.length - 1; i > -1; i--) {
            childNodes.push(node.childNodes[i]);
        }

        for (j = 0; j < childNodes.length; j++) {
            /* The cleaning process may add new nodes, at the same time,
              we need to go through the nodes in reverse order.
              This means we need to do these calculations with j and i. */
            if (childNodes[j].nodeName in cleanContainerElements) {
                cleanContainerElements[childNodes[j].nodeName](childNodes[j]);
            } else {
                that.loop(childNodes[j]);
                that.cleanChildNode(childNodes[j]);
            }
        }
        return node;
    };

    this.init = function() {
        var node = this.element,
            blockNode = false,
            newNode, childNode, childNodes = [], figures, textBlockElements, i;

        node.classList.add('clean-container');
        node.innerHTML = node.innerHTML.replace(/\n/g,' ').trim();
        node.innerHTML = node.innerHTML.replace(/&nbsp;/g, ' ');
        node.innerHTML = node.innerHTML.replace(/\s{2,}/g, ' ');
        that.loop(node);
        node.innerHTML = node.innerHTML.replace(/\s{2,}/g, ' ');
        //node.innerHTML = node.innerHTML.replace(/&nbsp;/g, ' '); // Joins sibling text nodes and replaces space signs.
        // Go through all nodes again. Any top node after a block node needs to be wrapped in a block node as well.
        for (i = 0; i < node.childNodes.length; i++) {
            childNodes.push(node.childNodes[i]);
        } // Put all the nodes in a list and then go through them one by one. This needs to be done, as we may want to delete some of the nodes.
        for (i = 0; i < childNodes.length; i++) {
            childNode = childNodes[i];
            if (blockNode && !(childNode.nodeName in topBlockElements)) {
                if (childNode.textContent.trim().length===0) {
                    node.removeChild(childNode);
                } else {
                    newNode = document.createElement('p');
                    node.replaceChild(newNode, childNode);
                    childNode.textContent = childNode.textContent.trim();
                    newNode.appendChild(childNode);
                }
            } else if (blockNode && (childNode.nodeName in topBlockElements) && childNode.childNodes.length===0) {
                // Block element is empty. Delete it.
                node.removeChild(childNode);
            } else if (blockNode && (childNode.nodeName in topBlockElements) && childNode.childNodes.length===1  && childNode.firstChild.textContent.trim().length === 0) {
                // Block element only contains spaces. Delete it.
                node.removeChild(childNode);
            } else if (!blockNode && childNode.nodeName in topBlockElements) {
                blockNode = true;
            }
        }
        // Make sure there is an empty line before and after each figure except at the very beginning and end of the paste.
        figures = jQuery(node).find('figure');
        for (i=0;i<figures.length;i++) {
            if (figure.previousSibling && editorHelpers.TEXT_BLOCK_ELEMENTS.indexOf(figure.previousSibling.nodeName) === -1) {
                newNode = document.createElement('p');
                newNode.innerHTML = '<br/>';
                node.insertBefore(newNode, figure);
            }
            if (figure.nextSibling && editorHelpers.TEXT_BLOCK_ELEMENTS.indexOf(figure.nextSibling.nodeName) === -1) {
                newNode = document.createElement('p');
                newNode.innerHTML = '<br/>';
                node.insertBefore(newNode, figure.nextSibling);
            }
        }
        // At the beginning of text block elements there are some times single spaces. Remove them.
        textBlockElements = jQuery(node).find(editorHelpers.TEXT_BLOCK_ELEMENTS.join(','));
        for (i=0;i<textBlockElements.length;i++) {
            if (textBlockElements[i].firstChild.nodeName==='#text') {
                textBlockElements[i].firstChild.textContent = textBlockElements[i].firstChild.textContent.trimLeft();
            }
        }


        // Special case: Paste is just one text block element long. We remove the block element and let the contents merge into the current block element.
        if (node.childNodes.length===1 && editorHelpers.TEXT_BLOCK_ELEMENTS.indexOf(node.childNodes[0].nodeName) != -1) {
            while (node.firstChild.firstChild) {
                node.appendChild(node.firstChild.firstChild);
            }
            node.removeChild(node.firstChild);
        }
        node.classList.remove('clean-container');
        return node;
    };
    this.init();
};
