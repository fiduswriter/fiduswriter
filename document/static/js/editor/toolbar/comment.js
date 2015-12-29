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
// Toolbar comment
jQuery(document).on('mousedown', '#button-comment:not(.disabled)', function (event) {
  /*
    var selection = rangy.getSelection(),
        range,
        insideComment,
        commentNode, insideCitation, savedSel;


    if (selection.rangeCount > 0) {
        range = selection.getRangeAt(0);
    } else {
        return false;
    }

    insideComment = jQuery(range.startContainer).closest('.comment')[0];

    event.preventDefault();

    if (insideComment) {
        commentNode = insideComment;
    } else {

        insideCitation = jQuery(range.startContainer).closest('.citation')[0];

        if (insideCitation) {
            range.selectNode(insideCitation);
        } else if (range.collapsed) {
            // The range is collapsed, so instead we will use the word around the selection.
            savedSel = rangy.saveSelection();
            range.startContainer.parentElement.normalize();
            rangy.restoreSelection(savedSel);
            range = selection.getRangeAt(0);

            // Using native range instead of rangy. This will be part of Rangy 1.3 text range module.
            range.nativeRange.expand('word');
            if (range.nativeRange.collapsed) {
                // The range is still collapsed! We must have been some place where there was no word.
                // We move the start of the range one character to the left and try again.
                range.moveCharLeft(true, 1);
                range.nativeRange.expand('word');

                if (range.nativeRange.collapsed) {

                    // We decide that no comment can be placed here.
                    console.log('could not find word');
                    return false;
                }
            }
        }
        commentNode = document.createElement('span');
        commentNode.classList.add('comment');

        if (!range.canSurroundContents()) {
            // We cannot surround the current selection, so we grab something nearby instead
            range.selectNode(selection.anchorNode);
        }
        if (range.canSurroundContents()) {
            // A bug in rangy -- some times it claims that certain content can be surrounded, when this is not the case.
            try {
                range.surroundContents(commentNode);
            } catch (err) {
                // We give up placing a comment at the current place.
                return false;
            }
        }
        commentHelpers.createNewComment(commentNode);
    }

    commentHelpers.layoutComments();*/
});
