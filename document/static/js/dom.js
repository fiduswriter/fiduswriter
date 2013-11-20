/**
 * @file Deals with common dom operations needed for caret movement. 
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
  * Common DOM functions needed for caret movement. TODO 
  * @namespace dom
  */
        dom = {};

    dom.findPreviousElement = function (node, upperLimitContainer) {
        // Tries to find the last element before node, excluding empty text nodes and within the upperLimitContainer.
        while (true) {
            if (node === upperLimitContainer) {
                return false;
            } else if (node.previousSibling) {
                node = node.previousSibling;

                if (node.nodeType !== 3 || node.length > 0) {
                    return node;
                }

            } else {
                node = node.parentElement;
            }
        }
    };

    dom.findNextElement = function (node, upperLimitContainer) {
        // Tries to find the next element after node, excluding empty text nodes and within the upperLimitContainer.
        while (true) {
            if (node === upperLimitContainer) {
                return false;
            } else if (node.nextSibling) {
                node = node.nextSibling;

                if (node.nodeType !== 3 || node.length > 0) {
                    return node;
                }

            } else {
                node = node.parentElement;
            }
        }
    };

    dom.findFirstElement = function (node, selector) {
        // Looks through a node to see if a node matching the selector can be found at the very beginning of it.
        while (true) {
            if (jQuery(node).is(selector)) {
                return node;
            } else if (!node || node.nodeType === 3) {
                return false;
            }
            node = node.firstChild;
        }
    };

    dom.findLastElement = function (node, selector) {
        // Looks through a node to see if a node matching the selector can be found at the very end of it.
        while (true) {
            if (jQuery(node).is(selector)) {
                return node;
            } else if (!node || node.nodeType === 3) {
                return false;
            }
            node = node.lastChild;
        }
    };

    dom.isAtStart = function (node, nodeAncestor) {
        // Go from node up to nodeAncestor up the DOM tree, making sure that it is at the very beginning of it.
        while (true) {
            if (node === nodeAncestor) {
                return true;
            } else if (node.previousSibling) {
                return false;
            }
            node = node.parentNode;
        }
    };

    dom.isAtEnd = function (node, nodeAncestor) {
        // Go from node up to nodeAncestor up the DOM tree, making sure that it is at the very end of it.
        while (true) {
            if (node === nodeAncestor) {
                return true;
            } else if (node.nextSibling) {
                return false;
            }
            node = node.parentNode;
        }
    };

    dom.isAtEndInCurrentContainer = function (range) {
        // If the endContainer is a text node, check whether the endOffset corresponds to the length of its text contents. Otherwise check if it corresponds to the last childNode.
        if (range.endContainer.nodeType === 3) {
            if (range.endOffset === range.endContainer.length) {
                return true;
            }
        } else {
            if (range.endOffset === range.endContainer.childNodes.length) {
                return true;
            } else if (range.endContainer.innerText === '\n') {
                return true;
            }
        }
        return false;
    };

    dom.splitNode = function (node, range) {
        // Split the change node at the caret position and return a selected empty space node between the two.
        var emptySpaceNode = document.createTextNode('\u180e');
        range.setEndAfter(node);
        var remainingNode = range.extractContents();
        range.collapseAfter(node);
        range.insertNode(remainingNode);
        range.insertNode(emptySpaceNode);
        range.selectNodeContents(emptySpaceNode);
        return range;
    };

    dom.noTrackIfDisabled = function (range) {
        if (!theDocument.settings.tracking) {
            var insideChange = jQuery(range.startContainer).closest('.ins,.del')[0];
            if (insideChange) {
                // We are inside a change node, although tracking has been disabled. 
                // This means that we have to split the change node at the current position, before we can continue.
                range = dom.splitNode(insideChange, range);
            }
        }
        return range;
    };

    dom.noCitationOrLinkNode = function (range) {
        var insideCitation, insideComment, insideLink, insideFootnote, nodeToEscape, emptySpaceNode;
        // Check if we are inside a citation
        insideCitation = jQuery(range.startContainer).closest('.citation,.equation')[0];

        // Check if we are inside a comment (if at the very end of it, we will need to escape)
        insideComment = jQuery(range.startContainer).closest('.comment')[0];
        
        // Check if we are inside a link (if at the very end of it, we will need to escape)
        insideLink = jQuery(range.startContainer).closest('a')[0];

        // Check if we are inside a footnote (if at the very end of it, we will need to escape)
        insideFootnote = jQuery(range.startContainer).closest('.pagination-footnote')[0];

        if (insideCitation 
            || (insideComment && (dom.isAtEndInCurrentContainer(range)) && (dom.isAtEnd(range.endContainer, insideComment))) 
            || (insideLink && (dom.isAtEndInCurrentContainer(range)) && (dom.isAtEnd(range.endContainer, insideLink))) 
            || (insideFootnote && (dom.isAtEndInCurrentContainer(range)) && (dom.isAtEnd(range.endContainer, insideFootnote)))) {

            if (insideCitation) {
                nodeToEscape = insideCitation;
            } else if (insideComment) {
                nodeToEscape = insideComment;
            } else if (insideLink) {
                nodeToEscape = insideLink;
            } else {
                nodeToEscape = insideFootnote;
            }

            // We insert a Mongolian vowel space which has no width. 
            emptySpaceNode = document.createTextNode('\u180e');
            
            nodeToEscape.parentNode.insertBefore(emptySpaceNode, nodeToEscape.nextSibling);
            range.selectNodeContents(emptySpaceNode);

            // The Mongolian vowel node has served it's purpose and can be removed again.
            // If tracking is enabled and we are inside a citation or a footnote, we have wait 1 millisecond before removing it.

            if (theDocument.settings.tracking && (insideCitation || insideFootnote || insideComment)) {
                range.collapse();

                function removeEmptySpace() {
                    jQuery(emptySpaceNode).remove();
                }
                setTimeout(removeEmptySpace, 1);
            }
        }

        return range;
    };

    dom.mergeParagraphs = function (firstPar, secondPar, range) {
        
        if (firstPar.innerText === '\n') {
            // The first paragraph is empty, so we remove it.
            jQuery(firstPar).remove();
            return range;
        }
        
        if (secondPar.firstChild.nodeType === 3 && secondPar.firstChild.textContent[0] === '\u180e') {
            // The first character of the second paragraph is an empty space node. 
            // This was placed there to allow the cursor to move before a footnote or citation. 
            // There is no more need for it now, so we will go ahead and remove it before merging the two paragraphs.
            var restTextNode = secondPar.firstChild.splitText(1);
            // We are splitting of the first character of the text node at the start of the second paragraph. 
            // In case more letters were added beyond the empty space node this is important.
            jQuery(secondPar.firstChild).remove();
        }
        // We normalize the second paragraph, which means we eliminate empty text nodes.
        secondPar.normalize();

        // We now move the caret at the end of the first paragraph.
        range.selectNodeContents(firstPar);
        range.collapse();
        if (secondPar.innerText !== '\n') {
            while (secondPar.firstChild) {
                // As long as the second paragraph has more children, we transfer them one by one to the first paragraph.
                firstPar.appendChild(secondPar.firstChild);
            }
        }
        // Now that the second paragraph is empty, we remove it.

        jQuery(secondPar).remove();
        return range;
    };

    dom.switchBlockElementWhileSavingCaretPosition = function(currentBlockElement, switchTo) {
        
        var savedSel, returnValue;
        
        if (currentBlockElement) {
            savedSel = rangy.saveSelection(); 
            returnValue = dom.switchBlockElement(currentBlockElement, switchTo);
            rangy.restoreSelection(savedSel);
            
        } else {
            returnValue = false;
        }
        return returnValue;
    };
    
    dom.switchBlockElement = function(currentBlockElement, switchTo) {
        var replacementNode, secondReplacementNode, oldList, secondOldList, thirdOldList;
        if (switchTo === 'ol' || switchTo === 'ul') {
            if (jQuery(currentBlockElement).parent().is(switchTo)) {
            // The current list type is selected already. This means we need to convert it to a paragraph.
                return dom.switchBlockElement(currentBlockElement, 'p');
            } else if (jQuery(currentBlockElement).is('li')) {
            // We are switching from one list type to another
                if (currentBlockElement.previousSibling) {
                    if (currentBlockElement.nextSibling) {
                        // This list item is between other list items of the same type.
                        oldList = currentBlockElement.parentNode;  
                        replacementNode = document.createElement(switchTo);
                        secondReplacementNode = oldList.cloneNode(false);
                        while (currentBlockElement.nextSibling) {
                            secondReplacementNode.appendChild(currentBlockElement.nextSibling);
                        }
                        replacementNode.appendChild(currentBlockElement);
                        oldList.parentNode.insertBefore(replacementNode, oldList.nextSibling);
                        replacementNode.parentNode.insertBefore(secondReplacementNode, replacementNode.nextSibling);
                        
                    } else {
                        // This list item only has list items before it
                        if (currentBlockElement.parentNode.nextSibling && jQuery(currentBlockElement.parentNode.nextSibling).is(switchTo)) {
                            // There is a list following this one of the type that we are switching to.
                            currentBlockElement.parentNode.nextSibling.insertBefore(currentBlockElement, currentBlockElement.parentNode.nextSibling.firstChild);
                        } else {
                            // A new list has to be created and added behind the current one.
                            oldList = currentBlockElement.parentNode; 
                            replacementNode = document.createElement(switchTo);
                            replacementNode.appendChild(currentBlockElement);
                            oldList.parentNode.insertBefore(replacementNode, oldList.nextSibling);
                        } 
                    }
                } else if (currentBlockElement.nextSibling) {
                    // This list item only has list items after it
                    if (currentBlockElement.parentNode.previousSibling && jQuery(currentBlockElement.parentNode.previousSibling).is(switchTo)) {
                            // There is a list before this one of the type that we are switching to.
                            currentBlockElement.parentNode.previousSibling.appendChild(currentBlockElement);
                        } else {
                            // A new list has to be created and added before the current one.
                            oldList = currentBlockElement.parentNode;
                            replacementNode = document.createElement(switchTo);
                            replacementNode.appendChild(currentBlockElement);
                            oldList.parentNode.insertBefore(replacementNode, oldList);
                        }
                } else {
                    // This is a single item of a list.
                    if (currentBlockElement.parentNode.previousSibling && jQuery(currentBlockElement.parentNode.previousSibling).is(switchTo)) {
                        if (currentBlockElement.parentNode.nextSibling && jQuery(currentBlockElement.parentNode.nextSibling).is(switchTo)) {
                            // There is a list of the same type both before and after this item. Add the current item to the list before it, 
                            // then remove the current list. Then move all items of the list behidn this one to the first list and finally 
                            // remove that list.
                            oldList = currentBlockElement.parentNode;
                            secondOldList = currentBlockElement.parentNode.previousSibling;
                            thirdOldList = currentBlockElement.parentNode.nextSibling;
                            secondOldList.appendChild(currentBlockElement);
                            oldList.parentNode.removeChild(oldList);
                            while (thirdOldList.firstChild) {
                                secondOldList.appendChild(thirdOldList.firstChild);
                            }
                            thirdOldList.parentNode.removeChild(thirdOldList);
                        } else {
                            // There is a list of the same type before this one. Move the item there and then delete the current list.
                            oldList = currentBlockElement.parentNode;
                            oldList.previousSibling.appendChild(currentBlockElement);
                            oldList.parentNode.removeChild(oldList);
                        }
                    } else if (currentBlockElement.parentNode.nextSibling && jQuery(currentBlockElement.parentNode.nextSibling).is(switchTo)) {
                        // There is a list of the same type after this one. Move the item there and then delete the current list.
                        oldList = currentBlockElement.parentNode;
                        oldList.nextSibling.insertBefore(currentBlockElement, oldList.nextSibling.firstChild);
                        oldList.parentNode.removeChild(oldList);
                    } else {
                        // This list item is the only list item in this list and there are no lists in front or behind it. We replace the old list with a new list.
                        oldList = currentBlockElement.parentNode;
                        replacementNode = document.createElement(switchTo);
                        replacementNode.appendChild(currentBlockElement);
                        oldList.parentNode.replaceChild(replacementNode, oldList);
                    }
                }
            } else if (currentBlockElement.previousSibling && jQuery(currentBlockElement.previousSibling).is(switchTo)) {
                if (currentBlockElement.nextSibling && jQuery(currentBlockElement.nextSibling).is(switchTo)) {
                    // There is a list of the same type both before and after this block element. All three will be merged.
                    currentBlockElement.previousSibling.innerHTML += '<li>'+currentBlockElement.innerHTML+'</li>' +
                    currentBlockElement.nextSibling.innerHTML;
                    currentBlockElement.parentNode.removeChild(currentBlockElement.nextSibling);
                    currentBlockElement.parentNode.removeChild(currentBlockElement);
                } else {
                    // There is a list of the same type before this block element. The contents of the current element will be added as another list item.
                    currentBlockElement.previousSibling.innerHTML += '<li>'+currentBlockElement.innerHTML+'</li>';
                    currentBlockElement.parentNode.removeChild(currentBlockElement);
                }
            } else if (currentBlockElement.nextSibling && jQuery(currentBlockElement.nextSibling).is(switchTo)) {
                // There is a list of the same type after this block element. The contents of the current element will be added as another list item.
                currentBlockElement.nextSibling.innerHTML = '<li>'+currentBlockElement.innerHTML+'</li>' +
                    currentBlockElement.nextSibling.innerHTML;
                currentBlockElement.parentNode.removeChild(currentBlockElement);
                    
            } else {
            // We are exchanging a P, H1, H2 or H3 with a list.
                replacementNode = document.createElement(switchTo);
                replacementNode.innerHTML = '<li>'+currentBlockElement.innerHTML+'</li>';
                currentBlockElement.parentNode.replaceChild(replacementNode, currentBlockElement);
            }
        } else {
            if (jQuery(currentBlockElement).is(switchTo)) {
                // The current element is already what we are switching to. Abort.
                return false;
            } else if (jQuery(currentBlockElement).is('li')) {
                // We are switching from a list to a P, H1, H2 or H3.
                oldList = currentBlockElement.parentNode;
                replacementNode = document.createElement(switchTo);
                replacementNode.innerHTML = currentBlockElement.innerHTML;
                if (currentBlockElement.previousSibling) {
                    if (currentBlockElement.nextSibling) {
                        // The currentBlockElement is a list item between other list items. We will need to split the list in two.
                        secondReplacementNode = oldList.cloneNode(false);
                        while (currentBlockElement.nextSibling) {
                            secondReplacementNode.appendChild(currentBlockElement.nextSibling);
                        }
                        oldList.removeChild(currentBlockElement);
                        oldList.parentNode.insertBefore(replacementNode, oldList.nextSibling);
                        replacementNode.parentNode.insertBefore(secondReplacementNode, replacementNode.nextSibling);
                    } else {
                        // The currentBlockElement is an item at the end of a list. We add a new element after the list and remove the item from the list.   
                        oldList.removeChild(currentBlockElement);
                        oldList.parentNode.insertBefore(replacementNode, oldList.nextSibling);
                    }
                } else if (currentBlockElement.nextSibling) {
                    // The currentBlockElement is an item at the start of a list. We add a new element before the list and remove the item from the list.
                    oldList.removeChild(currentBlockElement);
                    oldList.parentNode.insertBefore(replacementNode, oldList);
                } else {
                   // The item is a single item within a list. We replace the list with the new element.
                   oldList.parentNode.replaceChild(replacementNode, oldList);
                }
                   
            } else {
                // We are exchanging one non-list block element with another.
                replacementNode = document.createElement(switchTo);
                replacementNode.innerHTML = currentBlockElement.innerHTML;
                currentBlockElement.parentNode.replaceChild(replacementNode, currentBlockElement);
            }
           
        }
        
        return true;
       
    };

    exports.dom = dom;

}).call(this);