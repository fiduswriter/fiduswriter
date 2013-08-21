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
        keyEvents = {};

    keyEvents.bindEvents = function () {
        // Send keydown events by testkeypress.
        jQuery('.editable').bind('keydown', function (evt) {
            return keyEvents.testKeyPress(evt, this);
        });
    }


    keyEvents.testKeyPress = function (evt, editorContainer) {
        switch (evt.keyCode) {
        case 8:
            if (keyEvents.backspace(evt, editorContainer)) {
                evt.preventDefault();
                return true;
            }
            break;
        case 9:
            if (keyEvents.tab(evt, editorContainer)) {
                evt.preventDefault();
                return true;
            }
            break;
        case 13:
            if (keyEvents.enter(evt, editorContainer)) {
                evt.preventDefault();
                return true;
            }
            break;
        case 16:
            if (keyEvents.shift(evt, editorContainer)) {
                evt.preventDefault();
                return true;
            }
            break;
        case 17:
            if (keyEvents.control(evt, editorContainer)) {
                evt.preventDefault();
                return true;
            }
            break;
        case 18:
            if (keyEvents.alt(evt, editorContainer)) {
                evt.preventDefault();
                return true;
            }
            break;
        case 20:
            if (keyEvents.alt(evt, editorContainer)) {
                evt.preventDefault();
                return true;
            }
            break;
        case 27:
            if (keyEvents.alt(evt, editorContainer)) {
                evt.preventDefault();
                return true;
            }
            break;
        case 32:
            if (keyEvents.space(evt, editorContainer)) {
                evt.preventDefault();
                return true;
            }
            break;
        case 37:
            if (keyEvents.arrowLeft(evt, editorContainer)) {
                evt.preventDefault();
                return true;
            }
            break;
        case 39:
            if (keyEvents.arrowRight(evt, editorContainer)) {
                evt.preventDefault();
                return true;
            }
            break;
        case 46:
            if (keyEvents.deleteKey(evt, editorContainer)) {
                evt.preventDefault();
                return true;
            }
            break;
        case 144:
            if (keyEvents.numLock(evt, editorContainer)) {
                evt.preventDefault();
                return true;
            }
            break;
        default:
            if (keyEvents.otherKey(evt, editorContainer)) {
                evt.preventDefault();
                return true;
            }
            break;
        }
        if (theDocument.settings.tracking) {
            return tracker.handleEvent(evt);
        } else {
            return true;
        }
    }



    // Keycode 8

    keyEvents.backspace = function (evt, editorContainer) {
        // Handles the pressing of the backspace key
        var range, selection, previousContainer, insideCitation, insideFootnote,
            foundFootnoteOrCitation;

        selection = rangy.getSelection();
        range = selection.getRangeAt(0);

        // Check if we are inside a citation
        insideCitation = jQuery(range.startContainer).closest('.citation')[0];
        if (insideCitation) {
            // We are inside a citation, now mark the citation as deleted.
            manualEdits.remove(insideCitation, range, true);

            return true;
        }

        // Check if we are inside a footnote and whether we are at the very beginning of it.
        insideFootnote = jQuery(range.startContainer).closest(
            '.pagination-footnote')[0];
        insideInnerFootnote = jQuery(range.startContainer).closest(
            '.pagination-footnote > span > span')[0];

        if (insideFootnote) {
            if (insideInnerFootnote && range.startOffset === 0 && dom.isAtStart(
                range.startContainer, insideFootnote)) {
                // We are at the very start inside a footnote. Just leave the caret where it is and don't delete anything.
                return true;
            } else if (!insideInnerFootnote) {
                // We are only in the outer part of the footnote. We will mark it as deleted.
                manualEdits.remove(insideFootnote, range, true);
                return true;
            }
        }

        if (range.startContainer.nodeType === 3 && range.startOffset === 1 &&
            range.startContainer.textContent[0] === '\u180e') {
            // We found an empty space node at the start of a paragraph. It was placed there by
            // the above section "---Adding an empty space node at the start of a paragraph---" before a footnote at the start of a line.
            // We will move the caret to the left part of the space and continue processing.

            range.selectNode(range.startContainer);
            range.collapse(true);
        }

        var thisParagraph = jQuery(range.startContainer).closest(
            'p, li, h1, h2, h3, code, blockquote')[0];

        if (thisParagraph && range.collapsed && range.startOffset === 0 && dom.isAtStart(range.startContainer,
            thisParagraph)) {
            // We are the very start of a paragraph. Pressing backspace here means merging this paragraph with the previous one.
            previousParagraph = thisParagraph.previousSibling;
            if (!previousParagraph || theDocument.settings.tracking || jQuery(previousParagraph).is('figure')) {
                // This is the first paragraph of the document or tracking is enabled or the previous block element is a figure.
                // Just leave the caret where it is
                return true;
            } else {
                range = dom.mergeParagraphs(previousParagraph, thisParagraph,
                    range);
                selection.removeAllRanges();
                selection.addRange(range);
                return true;
            }
        }


        // The selection range has to be collapsed and either be right at the start of an element, or not be a text node.
        if (range.collapsed && (range.startOffset === 0 || range.startContainer
            .nodeType !== 3)) {
            if (range.startOffset === 0) {
                previousContainer = dom.findPreviousElement(range.startContainer,
                    editorContainer);
            } else {
                previousContainer = range.startContainer.childNodes[range.startOffset -
                    1];
            }

            if (previousContainer && previousContainer.nodeType !== 3) {
                // Try to find a footnote or citation at the extreme end of the previous container
                foundFootnoteOrCitation = dom.findLastElement(previousContainer,
                    '.pagination-footnote, .citation');
                // If we find a footnote or citation, we hand the entire node to be deleted.
                if (foundFootnoteOrCitation) {
                    manualEdits.remove(foundFootnoteOrCitation, range, true);
                    // The previous node has been (marked as) deleted already, so we return true which prevents the default backspace key action from happening.
                    return true;
                }
            } else if (!previousContainer) {
                // We are at the beginning of the very first paragraph in the editor. Leave the caret where it is without deleting anything.
                return true;
            }

        }
        // return false so that the delete key action will take place.
        return false;
    };

    // Keycode 9

    keyEvents.tab = function (evt, editorContainer) {
        return true;
        //TODO: figure out what to do when user presses tab key. Currently the tab key is just disabled.
    };

    // Keycode 13

    keyEvents.enter = function (evt, editorContainer) {
        // Handles Enter.
        // This will make sure we are outside of any citation before the line break is inserted.
        var selection, range, insideSpecialElement, paragraphNode;
        selection = rangy.getSelection();
        range = selection.getRangeAt(0);

        // Check if we are inside a citation, footnote or link
        insideSpecialElement = jQuery(range.startContainer).closest(
            '.citation, .pagination-footnote, .comment, a')[0];
        if (insideSpecialElement) {
            // We insert a Mongolian vowel space which has no width.
            emptySpaceNode = document.createTextNode('\u180e');
            if (insideSpecialElement.nextSibling) {
                insideSpecialElement.parentNode.insertBefore(emptySpaceNode,
                    insideSpecialElement.nextSibling);
            } else {
                insideSpecialElement.parentNode.appendChild(emptySpaceNode);
            }
            range.selectNodeContents(emptySpaceNode);
            range.collapse();
            selection.removeAllRanges();
            selection.addRange(range);
            // The Mongolian vowel node has served it's purpose and can be removed again.
            // Different from entering other characters, in the case of Enter we need to time it out.

            function removeEmptySpace() {
                jQuery(emptySpaceNode).remove();
            }
            setTimeout(removeEmptySpace, 1);
        } else if (dom.isAtEndInCurrentContainer(range) && range.endContainer.nextSibling &&
            jQuery(range.endContainer.nextSibling).is('.pagination-footnote')) {
            // We are directly in front of a footnote. We insert an empty space node before this footnote before executing the enter.
            var currentContainer = range.endContainer;
            emptySpaceNode = document.createTextNode('\u180e');
            currentContainer.parentNode.insertBefore(emptySpaceNode,
                currentContainer.nextSibling);
        }




        insideHeadline = jQuery(range.startContainer).closest('h1, h2, h3')[0];

        if (insideHeadline) {
            if (dom.isAtEndInCurrentContainer(range) && dom.isAtEnd(range.startContainer, insideHeadline)) {
                // If one presses enter at the end of a headline, instead of creating a new paragraph,
                // Chrome tends to create a div. We therefore interrupt the default action and create a paragraph manually.
                paragraphNode = document.createElement('p');
                paragraphNode.innerHTML = '<br>';
                insideHeadline.parentNode.insertBefore(paragraphNode,
                    insideHeadline.nextSibling);
                range.selectNode(paragraphNode);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                return true;
            } else if (range.startOffset===0 && dom.isAtStart(range.startContainer, insideHeadline)) {
                paragraphNode = document.createElement('p');
                paragraphNode.innerHTML = '<br>';
                insideHeadline.parentNode.insertBefore(paragraphNode,
                    insideHeadline);
                return true;
            }
        }

        // If one presses enter inside an empty list item, convert this list item into a paragraph.

        insideList = jQuery(range.startContainer).closest('li')[0];

        if (insideList && insideList.innerText === '\n') {
            dom.switchBlockElementWhileSavingCaretPosition(insideList, 'p');
            return true;
        }

        return false;
    };

    // Keycode 16

    keyEvents.shift = function (evt, editorContainer) {
        return false;
    };

    // Keycode 17

    keyEvents.control = function (evt, editorContainer) {
        return false;
    };

    // Keycode 18

    keyEvents.alt = function (evt, editorContainer) {
        return false;
    };

    // Keycode 20

    keyEvents.capsLock = function (evt, editorContainer) {
        return false;
    };

    // Keycode 27

    keyEvents.esc = function (evt, editorContainer) {
        return false;
    };


    // Keycode 32

    var spaceNode;

    keyEvents.space = function (evt, editorContainer) {

        var range, selection;

        // Insert a scientific space as space character for now. We replace it when entering the next letter (see below under 'otherKey').
        spaceNode = document.createTextNode('\u205f');

        keyEvents.otherKey(evt, editorContainer);

        selection = rangy.getSelection();
        range = selection.getRangeAt(0);

        manualEdits.insert(spaceNode, range);

        selection.removeAllRanges();
        selection.addRange(range);

        return true;

    };


    // Keycode 37

    keyEvents.arrowLeft = function (evt, editorContainer) {
        var range, selection, previousContainer, insideCitation, insideFootnote,
            foundFootnoteOrCitation, emptySpaceNode;
        // Handles the pressing of the arrow left key
        selection = rangy.getSelection();
        range = selection.getRangeAt(0);

        // Check if we are inside a citation, but not at the very beginning of it.
        insideCitation = jQuery(range.startContainer).closest(
            '.citation')[0];

        if (insideCitation && (range.startOffset !== 0 || !dom.isAtStart(range.startContainer,
            insideCitation))) {
            if (dom.isAtStart(insideCitation, jQuery(insideCitation).closest(
                'li')[0])) {
                // We are inside a citation that is the very first element inside a list item.
                // There is no problem putting the caret in front of it, so there is no need to
                // place a space node in front of it.

            } else if (dom.isAtStart(insideCitation, jQuery(insideCitation).closest(
                'p')[0])) {
                // ---Adding an empty space node at the start of a paragraph---
                // We are inside a citation that is the very first element inside a paragraph.
                // We will need to add a character before it so that we can put the caret there.
                emptySpaceNode = document.createTextNode('\u180e');
                var containerBlock = jQuery(insideCitation).closest('p')[0];
                containerBlock.insertBefore(emptySpaceNode, containerBlock.firstChild);
            }
            // We are inside a citation, now move the caret to the left of it.
            range.selectNode(insideCitation);
            range.collapse(true);
            // selection = rangy.getSelection();
            selection.removeAllRanges();
            selection.addRange(range);
            return true;
        }

        // Check if we are inside a footnote and whether we are at the very beginning of it.
        insideFootnote = jQuery(range.startContainer).closest(
            '.pagination-footnote')[0];
        if (insideFootnote) {
            insideInnerFootnote = jQuery(range.startContainer).closest(
                '.pagination-footnote > span > span')[0];
            if (insideInnerFootnote && range.startOffset === 0 && dom.isAtStart(
                range.startContainer, insideFootnote)) {
                // We are at the very start inside a footnote. Just leave the caret where it is.
                return true;
            } else if (!insideInnerFootnote) {

                if (dom.isAtStart(insideFootnote, jQuery(insideFootnote).closest(
                    'p, li, h1, h2, h3, code, blockquote')[0])) {
                    // ---Adding an empty space node at the start of a paragraph---
                    // We are inside the outer part of a footnote that is the very first element inside a paragaph.
                    // We will need to add a character before it so that we can put the caret there.
                    emptySpaceNode = document.createTextNode('\u180e');
                    var containerBlock = jQuery(insideFootnote).closest(
                        'p, li, h1, h2, h3, code, blockquote')[0];
                    containerBlock.insertBefore(emptySpaceNode, containerBlock.firstChild);
                }
                // We are only in the outer part of the footnote. We will move the caret to the left of the footnote.
                range.selectNode(insideFootnote);
                range.collapse(true);
                selection.removeAllRanges();
                selection.addRange(range);
                return true;
            }
        }

        if (range.startContainer.nodeType === 3 && range.startOffset === 0 && jQuery(range.startContainer.previousSibling).is('.equation')) {
            // We are just behind an equation.
            if (dom.isAtStart(range.startContainer.previousSibling, jQuery(range.startContainer).closest('p, li, h1, h2, h3, code, blockquote')[0])) {
                // The equation is at the start of a container item. Place an empty space node in front of it and move the cursor there.
                emptySpaceNode = document.createTextNode('\u180e');
                var containerBlock = jQuery(range.startContainer).closest(
                    'p, li, h1, h2, h3, code, blockquote')[0];
                containerBlock.insertBefore(emptySpaceNode, containerBlock.firstChild);
            }
            range.selectNode(range.startContainer.previousSibling.previousSibling);
            range.collapse();
            selection.removeAllRanges();
            selection.addRange(range);
            return true;
        }

        if (range.startContainer.nodeType === 3 && range.startOffset === 1 &&
            range.startContainer.textContent[0] === '\u180e') {
            // We found an empty space node at the start of a paragraph. It was placed there by
            // the above section "---Adding an empty space node at the start of a paragraph---" before a footnote at the start of a line.
            // We will move the caret to the left part of the space and continue processing.
            range.selectNode(range.startContainer);
            range.collapse(true);
            selection.removeAllRanges();
            selection.addRange(range);
            return false;
        }

        // The selection range has to be collapsed and either be right at the start of an element, or not be a text node.
        if (range.collapsed && (range.startOffset === 0 || range.startContainer
            .nodeType !== 3)) {
            if (range.startOffset === 0) {
                previousContainer = dom.findPreviousElement(range.startContainer,
                    editorContainer);
            } else {
                previousContainer = range.startContainer.childNodes[range.startOffset -
                    1];
            }
            // Check if we are in front of a new paragraph. If so, let the cursor move its natural course.
            if (previousContainer && jQuery(previousContainer).is(
                'p, li, h1, h2, h3, code, blockquote')) {
                return false;
                // Check if the previous node has to be something else than a text node for us to look at it.
            } else if (previousContainer && previousContainer.nodeType !== 3) {
                // Try to find a footnote or citation at the extreme end of the previous container
                foundFootnoteOrCitation = dom.findLastElement(previousContainer,
                    '.pagination-footnote, .citation');
                // If we find a footnote or citation, move the caret before it.
                if (foundFootnoteOrCitation) {
                    range.selectNodeContents(foundFootnoteOrCitation);
                    range.collapse(true);
                    selection.removeAllRanges();
                    selection.addRange(range);
                    return true;
                }

            } else {
                // We are at the beginning of the very first element. Just leave the caret where it is.
                return true;
            }
        }
        // return false so that the delete key action will take place.
        return false;
    };

    // Keycode 39

    keyEvents.arrowRight = function (evt, editorContainer) {
        // Handles the pressing of an arrow right key
        var range, nextContainer, foundFootnoteOrCitation, insideFootnote,
            insideInnerFootnote;

        selection = rangy.getSelection();
        range = selection.getRangeAt(0);

        // Check whether we are inside a citation (relevant at the start of a line)
        insideCitation = jQuery(range.startContainer).closest(
            '.citation')[0];

        if (insideCitation && (!dom.isAtEndInCurrentContainer(range) || !dom.isAtEnd(
            range.endContainer, insideCitation))) {
            range.selectNode(insideCitation);
            range.collapse();
            selection.removeAllRanges();
            selection.addRange(range);
            return true;
        }

        // Check if we are inside a the inner part of a footnote and whether we are at the very end of it.
        insideInnerFootnote = jQuery(range.startContainer).closest(
            '.pagination-footnote > span > span')[0];

        // Check whether we are at the very end of the inner part of a footnote
        if (insideInnerFootnote && dom.isAtEndInCurrentContainer(range) && dom.isAtEnd(
            range.endContainer, insideInnerFootnote)) {
            // We are at the very end inside a footnote. Just leave the caret where it is.
            return true;
        }

        if (range.startContainer.nodeType === 3 && range.startOffset === 0 &&
            range.startContainer.textContent[0] === '\u180e') {
            // We found an empty space node at the start of a paragraph. It was placed there by
            // the above section "---Adding an empty space node at the start of a paragraph---" before a footnote at the start of a line.
            // We will move the caret to the right part of the space and continue processing.

            range.selectNode(range.startContainer);
            range.collapse();
        }

        // The selection range has to be collapsed and either be right at the end of an element, or not be a text node.
        if (range.collapsed && (dom.isAtEndInCurrentContainer(range) || range.startContainer
            .nodeType !== 3)) {
            if (dom.isAtEndInCurrentContainer(range)) {
                nextContainer = dom.findNextElement(range.startContainer,
                    editorContainer);
            } else {
                nextContainer = range.startContainer.childNodes[range.startOffset];
            }
            // Check if we are at the end of a paragraph. If so, check if there is a footnote
            // at the start of the next paragraph. If this is the case, an empty space needs
            // to be inserted before it.
            if (nextContainer && jQuery(nextContainer).is('p, li, h1, h2, h3, code, blockquote')) {
                foundFootnote = dom.findFirstElement(nextContainer,
                    '.pagination-footnote');

                if (foundFootnote) {
                    // We found a footnote at the very start of the next block element, we need
                    // to insert an empty space character before it so that the caret can be moved there.
                    emptySpaceNode = document.createTextNode('\u180e');
                    foundFootnote.parentNode.insertBefore(emptySpaceNode,
                        foundFootnote);
                }
                // Else check if the next node is something else than a text node.
            } else if (nextContainer.nodeType !== 3) {
                // Try to find a footnote or citation at the beginning of the next container
                foundFootnoteOrCitation = dom.findFirstElement(nextContainer,
                    '.pagination-footnote, .citation');
                // If we find a footnote or citation, we need to move the caret to the right of it.
                if (foundFootnoteOrCitation) {

                    range.selectNodeContents(foundFootnoteOrCitation);
                    range.collapse();

                    selection.removeAllRanges();
                    selection.addRange(range);
                    return true;
                }
            }
        }
        // return false so that the arrow right key action will take place.
        return false;
    };

    // Keycode 46

    keyEvents.deleteKey = function (evt, editorContainer) {
        // Handles the pressing of the delete key
        var range, selection, nextContainer, foundFootnoteOrCitation,
                insideFootnote;

        selection = rangy.getSelection();
        range = selection.getRangeAt(0);

        // Check if we are inside a footnote and whether we are at the very end of it.
        insideInnerFootnote = jQuery(range.startContainer).closest(
            '.pagination-footnote > span > span')[0];

        if (insideInnerFootnote && range.collapsed && dom.isAtEndInCurrentContainer(range) && dom.isAtEnd(
            range.endContainer, insideInnerFootnote)) {
            // We are at the very end inside a footnote. Just leave the caret where it is.
            return true;
        }

        // Check whether we are inside a citation (relevant at the start of a line).
        // If we are, delete it.
        insideCitation = jQuery(range.startContainer).closest('.citation')[0];
        if (insideCitation) {
            manualEdits.remove(insideCitation, range);
        }

        if (range.startContainer.nodeType === 3 && range.startOffset === 0 &&
            range.startContainer.textContent[0] === '\u180e') {
            // We found an empty space node at the start of a paragraph. It was placed there by
            // the above section "---Adding an empty space node at the start of a paragraph---" before a footnote at the start of a line.
            // We will move the caret to the right part of the space and continue processing.

            range.selectNode(range.startContainer);
            range.collapse();
        }

        var thisParagraph = jQuery(range.startContainer).closest(
            'p, li, h1, h2, h3, code, blockquote')[0];

        if (thisParagraph && range.collapsed && dom.isAtEndInCurrentContainer(range) && dom.isAtEnd(
            range.startContainer, thisParagraph)) {
            // We are the very end of a paragraph. Hitting delete here means merging this paragraph with the next one.
            nextParagraph = thisParagraph.nextSibling;
            if (!nextParagraph || theDocument.settings.tracking || jQuery(nextParagraph).is('figure')) {
                // This is the last paragraph of the document or tracking is enabled or a fiure is following this paragraph.
                // Just leave the caret where it is.
                return true;
            } else {
                range = dom.mergeParagraphs(thisParagraph, nextParagraph, range);
                selection.removeAllRanges();
                selection.addRange(range);
                return true;
            }
        }


        // The selection range has to be collapsed and either be right at the end of an element, or not be a text node.
        if (range.collapsed && (dom.isAtEndInCurrentContainer(range) || range.startContainer
            .nodeType !== 3)) {
            if (dom.isAtEndInCurrentContainer(range)) {
                nextContainer = dom.findNextElement(range.startContainer,
                    editorContainer);
            } else {
                nextContainer = range.startContainer.childNodes[range.startOffset];
            }
            if (nextContainer.nodeType !== 3) {
                // Try to find a footnote or citation at the beginning of the next container
                foundFootnoteOrCitation = dom.findFirstElement(nextContainer,
                    '.pagination-footnote, .citation');
                // If we find a footnote or citation, we hand the entire node to be deleted.
                if (foundFootnoteOrCitation) {
                    manualEdits.remove(foundFootnoteOrCitation, range);
                    // The next node has been (marked as) deleted already, so we return true which prevents the default delete key action from happening.
                    return true;
                }
            }
        }
        // return false so that the delete key action will take place.
        return false;
    };

    // Keycode 144

    keyEvents.numLock = function (evt, editorContainer) {
        return false;
    };


    // Default

    keyEvents.
    otherKey = function (evt, editorContainer) {
        // Handles letters and numbers.
        // This will check whether the caret is at a valid position.
        var range, selection;

        selection = rangy.getSelection();
        range = selection.getRangeAt(0);

        if (spaceNode && spaceNode.parentNode) {
            function replaceSpace() {
                // We replace the last entered space (for which we used a scientific space) with a normal space when the next letter is being entered.
                // This way we make sure that words break correctly at the end of lines.
                if (spaceNode) {
                    var savedSel = rangy.saveSelection();
                    var newLetter = spaceNode.splitText(1);
                    spaceNode.nodeValue = ' ';
                    spaceNode = null;
                    newLetter.parentNode.normalize();
                    rangy.restoreSelection(savedSel);
                }
            }
            setTimeout(replaceSpace, 1);
        }
        if (range.startContainer.nodeType === 3 && range.startOffset === 0 &&
            range.startContainer.textContent[0] === '\u180e') {
            // We found an empty space node at the start of a paragraph. It was placed there by
            // the above section "---Adding an empty space node at the start of a paragraph---" before a footnote at the start of a line.
            // We will move the caret to the right part of the space and continue processing.
            range.selectNode(range.startContainer);
            range.collapse();
        }
        // Check whether tracking has been disabled and if so, wehther we are in a change node that we need to get out of.
        range = dom.noTrackIfDisabled(range);

        // Chech whether tracking is inside a citation or link node. If yes, get it out.
        range = dom.noCitationOrLinkNode(range);


        // Check whether bold setting corresponds with whether we currently are using bold.
        if (jQuery('.bold_button.ui-state-active').length > 0 && jQuery(range.startContainer)
            .closest('b').length === 0) {
            var boldNode = document.createElement('b');
            boldNode.innerHTML = '\u180e';
            if (!range.collapsed) {
                range.collapse();
            }
            range.insertNode(boldNode);
            range.selectNodeContents(boldNode);
        } else if (jQuery('.bold_button.ui-state-active').length === 0 &&
            jQuery(range.startContainer).closest('b').length > 0) {
            dom.splitNode(jQuery(range.startContainer).closest('b')[0], range);
        }

        // Check whether italics setting corresponds with whether we currently are using italics.
        if (jQuery('.italic_button.ui-state-active').length > 0 && jQuery(range
            .startContainer).closest('i').length === 0) {
            var italicsNode = document.createElement('i');
            italicsNode.innerHTML = '\u180e';
            if (!range.collapsed) {
                range.collapse();
            }
            range.insertNode(italicsNode);
            range.selectNodeContents(italicsNode);

        } else if (jQuery('.italic_button.ui-state-active').length === 0 &&
            jQuery(range.startContainer).closest('i').length > 0) {
            dom.splitNode(jQuery(range.startContainer).closest('i')[0], range);
        }

        selection.removeAllRanges();
        selection.addRange(range);

        return false;
    };

    exports.keyEvents = keyEvents;

}).call(this);