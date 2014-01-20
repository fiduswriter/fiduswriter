/**
 * @file Handles the pressing of keys on the editor page. Needs to work around bugs in Chrome/Safari.
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
        /** Handles key press events on the editor page. TODO 
         * @namespace keyEvents
         */
        keyEvents = {};


    keyEvents.bindEvents = function () {
        // Send keydown events while editing by testKeyPressEditing.
        jQuery('.editable').bind('keydown', function (evt) {
            if (theDocumentValues.disableInput) {
                evt.preventDefault();
                return true;
            }
            return keyEvents.testKeyPressEditing(evt, this);
        });
        jQuery('.editable').bind('keyup', function (evt) {
            if (theDocumentValues.disableInput) {
                evt.preventDefault();
                return true;
            }
            return keyEvents.testKeyPressAfterEditing(evt, this);
        });

        // Send keydown events while on editor page by testKeyPressEditor
        jQuery(document).keydown(function (evt) {

            if (theDocumentValues.disableInput) {
                evt.preventDefault();
                return true;
            }

            return keyEvents.testKeyPressEditor(evt);
        });

    };

    keyEvents.testKeyPressEditor = function (evt) {

        switch (evt.which) {
        case 19:
            if (keyEvents.macCommandSKey(evt)) {
                evt.preventDefault();
                return true;
            }
            break;
        case 83:
            if (keyEvents.sKey(evt)) {
                evt.preventDefault();
                return true;
            }
            break;
        case 90:
            if (keyEvents.zKeyEditor(evt)) {
                evt.preventDefault();
                return true;
            }
            break;
        case 191:
            if (keyEvents.questionKey(evt)) {
                evt.preventDefault();
                return true;
            }
            break;
        }

        return true;

    };


    keyEvents.testKeyPressEditing = function (evt, editorContainer) {
        switch (evt.which) {
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
            if (keyEvents.capsLock(evt, editorContainer)) {
                evt.preventDefault();
                return true;
            }
            break;
        case 27:
            if (keyEvents.esc(evt, editorContainer)) {
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
        case 85:
            if (keyEvents.uKey(evt, editorContainer)) {
                evt.preventDefault();
                return true;
            }
            break;
        case 90:
            if (keyEvents.zKeyEditing(evt, editorContainer)) {
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
        case 229:
            return true;
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
    };


    keyEvents.testKeyPressAfterEditing = function (evt, editorContainer) {
        switch (evt.keyCode) {
        case 27: // ESC
            evt.preventDefault();
            evt.stopPropagation();
            jQuery(editorContainer).trigger('blur');
            break;
        default:
            break;
        }
    };

    // Keycode 8

    keyEvents.backspace = function (evt, editorContainer) {
        // Handles the pressing of the backspace key
        var selection = rangy.getSelection(), range = selection.getRangeAt(0), previousContainer, insideFootnote,
            foundFootnote;

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
                // Try to find a footnote at the extreme end of the previous container
                foundFootnote = dom.findLastElement(previousContainer,
                    '.pagination-footnote');
                // If we find a footnote, we hand the entire node to be deleted.
                if (foundFootnote) {
                    manualEdits.remove(foundFootnote, range, true);
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
        var selection, range, insideSpecialElement, paragraphNode;
        selection = rangy.getSelection();
        range = selection.getRangeAt(0);

        // Check if we are inside a citation, footnote or link
        insideSpecialElement = jQuery(range.startContainer).closest(
            '.pagination-footnote, .comment, a')[0];
        if (insideSpecialElement) {
            // We insert a Mongolian vowel space which has no width.
            emptySpaceNode = document.createTextNode(' ');
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
            emptySpaceNode = document.createTextNode(' ');
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
            } else if (range.startOffset === 0 && dom.isAtStart(range.startContainer, insideHeadline)) {
                paragraphNode = document.createElement('p');
                paragraphNode.innerHTML = '<br>';
                insideHeadline.parentNode.insertBefore(paragraphNode,
                    insideHeadline);
                return true;
            }
        }

        // If one presses enter inside an empty list item, convert this list item into a paragraph.

        insideList = jQuery(range.startContainer).closest('li')[0];

        if (insideList && insideList.textContent === '\n') {
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

    // Keycode 19

    keyEvents.macCommandSKey = function (evt) {
        editorHelpers.getUpdatesFromInputFields(function () {
            editorHelpers.saveDocument();
        });
        exporter.uploadNative(theDocument);
        return true;
    };

    // Keycode 20

    keyEvents.capsLock = function (evt, editorContainer) {
        return false;
    };

    // Keycode 27

    keyEvents.esc = function (evt, editorContainer) {
        return true;
    };


    // Keycode 32

    var spaceNode;

    keyEvents.space = function (evt, editorContainer) {

        var range, selection;

        // Insert a scientific space as space character for now. We replace it when entering the next letter (see below under 'otherKey').
        spaceNode = document.createTextNode(' ');

        keyEvents.otherKey(evt, editorContainer);

        selection = rangy.getSelection();
        range = selection.getRangeAt(0);

        manualEdits.insert(spaceNode, range);
        
        selection.removeAllRanges();
        selection.addRange(range);

        return true;

    };


    // Keycode 37
     /** Handles the pressing of the arrow left key */
    keyEvents.arrowLeft = function (evt, editorContainer) {

        var selection = rangy.getSelection(), range = selection.getRangeAt(0), previousContainer, insideFootnote,
             foundFootnote, emptySpaceNode;


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
                // We are only in the outer part of the footnote. We will move the caret to the left of the footnote.
                range.selectNode(insideFootnote);
                range.collapse(true);
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
            // Check if we are in front of a new paragraph. If so, let the cursor move its natural course.
            if (previousContainer && jQuery(previousContainer).is(
                'p, li, h1, h2, h3, code, blockquote')) {
                return false;
                // Check if the previous node has to be something else than a text node for us to look at it.
            } else if (previousContainer && previousContainer.nodeType !== 3) {
                // Try to find a footnote or citation at the extreme end of the previous container
                foundFootnote = dom.findLastElement(previousContainer,
                    '.pagination-footnote');
                // If we find a footnote or citation, move the caret before it.
                if (foundFootnote) {
                    range.selectNodeContents(foundFootnote);
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
        // return false so that the arrow left key action will take place.
        return false;
    };

    // Keycode 39

    keyEvents.arrowRight = function (evt, editorContainer) {
        // Handles the pressing of an arrow right key
        var range, nextContainer, foundFootnote, insideFootnote,
            insideInnerFootnote, spaceCharacter;

        selection = rangy.getSelection();
        range = selection.getRangeAt(0);

        // Check if we are inside a the inner part of a footnote and whether we are at the very end of it.
        insideInnerFootnote = jQuery(range.startContainer).closest(
            '.pagination-footnote > span > span')[0];

        // Check whether we are at the very end of the inner part of a footnote
        if (insideInnerFootnote && dom.isAtEndInCurrentContainer(range) && dom.isAtEnd(
            range.endContainer, insideInnerFootnote)) {
            // We are at the very end inside a footnote. Just leave the caret where it is.
            return true;
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
                    // to insert an space character before it so that the caret can be moved there.
                    spaceNode = document.createTextNode(' ');
                    foundFootnote.parentNode.insertBefore(spaceNode,
                        foundFootnote);
                }
                // Else check if the next node is something else than a text node.
            } else if (nextContainer.nodeType !== 3) {
                // Try to find a footnote or citation at the beginning of the next container
                foundFootnoteOrCitation = dom.findFirstElement(nextContainer,
                    '.pagination-footnote');
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



        var thisParagraph = jQuery(range.startContainer).closest(
            'p, li, h1, h2, h3, code, blockquote')[0];

        if (thisParagraph && range.collapsed && dom.isAtEndInCurrentContainer(range) && dom.isAtEnd(
            range.startContainer, thisParagraph)) {
            // We are the very end of a paragraph. Hitting delete here means merging this paragraph with the next one.
            nextParagraph = thisParagraph.nextSibling;
            if (!nextParagraph || theDocument.settings.tracking || jQuery(nextParagraph).is('figure')) {
                // This is the last paragraph of the document or tracking is enabled or a figure is following this paragraph.
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

    // Keycode 83

    keyEvents.sKey = function (evt) {
        if (evt.ctrlKey) {
            return keyEvents.macCommandSKey(evt);
        } else {
            return false;
        }
    };

    // Keycode 85

    keyEvents.uKey = function (evt, editorContainer) {
        // Prevent ctrl+u but don't prevent normal u.
        if (evt.ctrlKey) {
            return true;
        } else {
            return keyEvents.otherKey(evt, editorContainer);
        }
    };

    // Keycode 90

    keyEvents.zKeyEditing = function (evt, editorContainer) {
        if (evt.ctrlKey) {
            return true;
        } else {
            return keyEvents.otherKey(evt, editorContainer);
        }
    };

    keyEvents.zKeyEditor = function (evt) {
        // Interrupt ctrl+z and ctrl+shift+z, but let normal z be treated as any other key.

        if (evt.ctrlKey) {

            if (evt.shiftKey) {
                // Redo
                return diffHelpers.redo();
            }
            // Undo            
            return diffHelpers.undo();
        } else {
            return false;
        }
    };


    // Keycode 144

    keyEvents.numLock = function (evt, editorContainer) {
        return false;
    };

    // Keycode 191

    keyEvents.questionKey = function (evt) {
        if (evt.ctrlKey) {
            jQuery().showShortcuts();
            return true;
        } else {
            return false;
        }
    };


    // Default

    keyEvents.
    otherKey = function (evt, editorContainer) {
        // Handles letters and numbers.
        // This will check whether the caret is at a valid position.
        var range, selection;

        selection = rangy.getSelection();
        range = selection.getRangeAt(0);

    /*    if (spaceNode && spaceNode.parentNode) {
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
        } */

        // Check whether tracking has been disabled and if so, wehther we are in a change node that we need to get out of.
        range = dom.noTrackIfDisabled(range);

        // Chech whether tracking is inside a citation or link node. If yes, get it out.
        range = dom.noCitationOrLinkNode(range);


        // Check whether bold setting corresponds with whether we currently are using bold.
        if (jQuery('#button-bold.ui-state-active').length > 0 && jQuery(range.startContainer)
            .closest('b').length === 0) {
            var boldNode = document.createElement('b'), tempSpaceNode = document.createTextNode(' ');
            boldNode.appendChild(tempSpaceNode);
            if (!range.collapsed) {
                range.collapse();
            }
            range.insertNode(boldNode);
            range.selectNodeContents(boldNode);
            range.collapse();
            function removeInitialSpace () {
                if (tempSpaceNode.data.length > 1 && tempSpaceNode.data[0]===' ') {
                    tempSpaceNode.data = tempSpaceNode.data.substring(1);
                    selection = rangy.getSelection();
                    range = rangy.createRange();
                    range.selectNodeContents(tempSpaceNode);
                    range.collapse();
                    selection.setSingleRange(range);
                }
            }
            setTimeout(removeInitialSpace, 1);
        
        
        } else if (jQuery('#button-bold.ui-state-active').length === 0 &&
            jQuery(range.startContainer).closest('b').length > 0) {
            dom.splitNode(jQuery(range.startContainer).closest('b')[0], range);
        }

        // Check whether italics setting corresponds with whether we currently are using italics.
        if (jQuery('#button-italic.ui-state-active').length > 0 && jQuery(range
            .startContainer).closest('i').length === 0) {
            var italicNode = document.createElement('i'), tempSpaceNode = document.createTextNode(' ');
            italicNode.appendChild(tempSpaceNode);
            if (!range.collapsed) {
                range.collapse();
            }
            range.insertNode(italicNode);
            range.selectNodeContents(italicNode);
            range.collapse();
            function removeInitialSpace () {
                if (tempSpaceNode.data.length > 1 && tempSpaceNode.data[0]===' ') {
                    tempSpaceNode.data = tempSpaceNode.data.substring(1);
                    selection = rangy.getSelection();
                    range = rangy.createRange();
                    range.selectNodeContents(tempSpaceNode);
                    range.collapse();
                    selection.setSingleRange(range);
                }
            }
            setTimeout(removeInitialSpace, 1);

        } else if (jQuery('#button-italic.ui-state-active').length === 0 &&
            jQuery(range.startContainer).closest('i').length > 0) {
            dom.splitNode(jQuery(range.startContainer).closest('i')[0], range);
        }

        selection.removeAllRanges();
        selection.addRange(range);

        return false;
    };

    exports.keyEvents = keyEvents;

}).call(this);