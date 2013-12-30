/**
 * @file Handles communications with the server (including document collaboration) over Websockets.
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
        /** Sets up communicating with server (retrieving document, saving, collaboration, etc.). TODO 
         * @namespace diffHelpers
         */
        diffHelpers = {}, domDiff = new DOMdiff(true, 500); // debug mode for DOMdiff

    var dmp = new diff_match_patch();

    domDiff.textDiff = function (node, currentValue, expectedValue, newValue) {
        var selection = document.getSelection(),
            range = selection.getRangeAt(0),
            containsSelection = false,
            finalValue, selectionStartOffset, selectionEndOffset;
        if (range.startContainer == node) {
            selectionStartOffset = range.startOffset;
            currentValue = currentValue.substring(0, range.startOffset) + '\0' + currentValue.substring(range.startOffset);
        }
        if (range.endContainer == node) {
            selectionEndOffset = range.endOffset;
            currentValue = currentValue.substring(0, range.endOffset + 1) + '\0' + currentValue.substring(range.endOffset + 1);
        }
        if (currentValue != expectedValue) {
            finalValue = dmp.patch_apply(dmp.patch_make(expectedValue, newValue), currentValue)[0]

        } else {
            finalValue = newValue;
        }
        if (finalValue.indexOf('\0') != -1) {
            if (selectionStartOffset) {
                selectionStartOffset = finalValue.indexOf('\0');
                finalValue = finalValue.replace('\0', '');
            }
            if (selectionEndOffset && finalValue.indexOf('\0') != -1) {
                selectionEndOffset = finalValue.indexOf('\0');
                finalValue = finalValue.replace('\0', '');
            }
        }

        node.data = finalValue;

        if (selectionStartOffset || selectionEndOffset) {
            //range = document.createRange();
            //range.selectNodeContents(node);
            if (selectionStartOffset) {
                if (finalValue.length <= selectionStartOffset) {
                    selectionStartOffset = finalValue.length - 1;
                }
                range.setStart(node, selectionStartOffset);
            }
            if (selectionEndOffset) {
                if (finalValue.length <= selectionEndOffset) {
                    selectionEndOffset = finalValue.length - 1;
                }
                range.setEnd(node, selectionEndOffset);
            }
            selection.removeAllRanges();
            selection.addRange(range);
        }

    };


    diffHelpers.setup = function () {
        theDocumentValues.newDiffs = [];
        theDocumentValues.usedDiffs = [];
        theDocumentValues.textChangeList = [];
        theDocumentValues.documentNode = document.getElementById('document-editable');
        theDocumentValues.diffNode = nodeConverter.toModel(theDocumentValues.documentNode); // a node against which changes are tested constantly.
        theDocumentValues.textChangeList.push([theDocumentValues.diffNode.cloneNode(true), new Date().getTime() + window.clientOffsetTime]); // A list of the most recent node versions, used when receiving older collaboration updates and undo.        
        diffHelpers.diffTimer = setInterval(diffHelpers.handleChanges, 100);
        theDocumentValues.disableInput = false;
    };

    diffHelpers.makeDiff = function (isUndo) {
        var theDiff = domDiff.diff(theDocumentValues.diffNode, nodeConverter.toModel(theDocumentValues.documentNode)),
            containsCitation = 0,
            containsEquation = 0,
            containsComment = 0,
            containsFootnote = 0,
            containsTrackedchange = 0,
            diffText = '',
            i;

        if (theDiff.length === 0) {
            return false;
        }
        // Needed?
        theDocumentValues.diffNode = nodeConverter.toModel(theDocumentValues.documentNode);

        for (i = 0; i < theDiff.length; i++) {
            if (theDiff[i].hasOwnProperty('element')) {
                diffText = JSON.stringify(theDiff[i]['element']);
            } else if (theDiff[i].hasOwnProperty('oldValue') && theDiff[i].hasOwnProperty('newValue')) {
                diffText = JSON.stringify(theDiff[i]['oldValue']) + JSON.stringify(theDiff[i]['newValue']);
            } else if (theDiff[i].hasOwnProperty('attribute')) {
                diffText = theDiff[i]['attribute']['name'];
            }
            if (diffText.indexOf('citation') != -1) {
                containsCitation = 1;
            }
            if (diffText.indexOf('equation') != -1) {
                containsEquation = 1;
            }
            if (diffText.indexOf('comment') != -1) {
                containsComment = 1;
            }
            if (diffText.indexOf('footnote') != -1) {
                containsFootnote = 1;
            }
            if (diffText.indexOf('data-cid') != -1) {
                containsTrackedchange = 1;
            }
        }

        var thePackage = {
            type: 'diff',
            time: new Date().getTime() + window.clientOffsetTime,
            diff: theDiff,
            features: [containsCitation, containsEquation, containsComment, containsFootnote, containsTrackedchange]
        };

        if (theDocumentValues.collaborativeMode) {
            serverCommunications.send(thePackage);
        }
        if (!isUndo) {
            if (theDocumentValues.undoMode) {
                delete theDocumentValues.undoMode;
                // We have been redoing and undoing and are just now leaving this mode. 
                // We delete all undoed diffs, as we will never be able to recover them.
                theDocumentValues.usedDiffs = _.where(theDocumentValues.usedDiffs, {
                    undo: undefined
                });
                // Enable undo button and disable redo button
                document.querySelector('.icon-ccw').parentNode.parentNode.classList.remove('disabled');
                document.querySelector('.icon-cw').parentNode.parentNode.classList.add('disabled');
            } 
            thePackage.session = theDocumentValues.session_id;
            if (theDocumentValues.collaborativeMode) {
                theDocumentValues.newDiffs.push(thePackage);
                diffHelpers.orderAndApplyChanges();
            } else {
                theDocumentValues.usedDiffs.push(thePackage);
            }
        }
        return true;
    };

    /** Execute an undo command on the editable area. */
    diffHelpers.undo = function () {
        var theDiffs, theDiff, isUndo = true, i;
        
        if (!theDocumentValues.undoMode) {
            // We are entering undo mdoe. We will make normal diffs one last time before starting with undoing.
            diffHelpers.makeDiff();
            theDocumentValues.undoMode = true;
        }
        theDiffs = _.where(theDocumentValues.usedDiffs, {
            session: theDocumentValues.session_id,
        }).reverse();


        for (i = 0; i < theDiffs.length; i++) {
            if (theDiffs[i].undo === undefined) {
                theDiff = theDiffs[i];
                i = theDiffs.length;
            }
        }
        
        if (!theDiff) {
            return true;
        }
        
        theDiff.undo = true;

        if (_.where(theDiffs, {undo:undefined}).length===0) {
            document.querySelector('.icon-ccw').parentNode.parentNode.classList.add('disabled');
        }
        
        diffHelpers.applyUndo(theDiff.time, isUndo);
        document.querySelector('.icon-cw').parentNode.parentNode.classList.remove('disabled');
        return true;
    };

    /** Execute a redo command on a previous undo command on the editable area. */
    diffHelpers.redo = function () {
        var theDiffs, theDiff, isUndo = true, i;
        theDiffs = _.where(theDocumentValues.usedDiffs, {
            session: theDocumentValues.session_id
        }).reverse();
        if (theDiffs.length === 0) {
            return true;
        }

        for (i = 0; i < theDiffs.length; i++) {
            if (theDiffs[i].undo === undefined) {
                if (i === 0) {
                    // Hit upon a non-undo related diff before finding a node to diff.
                    return true;
                } else {
                    delete theDiffs[i - 1].undo;
                    theDiff = theDiffs[i - 1];
                    i = theDiffs.length;
                }
            } else if (i === (theDiffs.length - 1)) {
                delete theDiffs[i].undo;
                theDiff = theDiffs[i];
            }

        }
        if (!theDiff) {
            // No more to redo.
            return true;
        }
        diffHelpers.applyUndo(theDiff.time, isUndo);
        
        if (_.where(theDiffs,{undo:true}).length===0) {
            document.querySelector('.icon-cw').parentNode.parentNode.classList.add('disabled');
        }
        document.querySelector('.icon-ccw').parentNode.parentNode.classList.remove('disabled');
        return true;
    };

    /** Applies all patches from a specific starting point, excluding those marked as undo patches.
     * By marking a specific patch for undo by adding the attribute undo = 1, one can effectively apply
     * that undo by running applyUndo using the timestamp of the diff as the starting point.
     * @param time A point in time before which patches will be applied.
     */
    diffHelpers.applyUndo = function (time, isUndo) {
        var i = theDocumentValues.textChangeList.length - 1,
            tempPatchedNode, startTime, applicableDiffs = [];

        while (theDocumentValues.textChangeList[i][1] > time) {
            i--;
        }

        tempPatchedNode = theDocumentValues.textChangeList[i][0].cloneNode(true);
        startTime = theDocumentValues.textChangeList[i][1];
        i = theDocumentValues.usedDiffs.length - 1;

        while (i > -1 && startTime < theDocumentValues.usedDiffs[i].time) {
            if (theDocumentValues.usedDiffs[i].undo === undefined) {
                applicableDiffs.unshift(theDocumentValues.usedDiffs[i]);
            }
            i--;
        }

        for (i = 0; i < applicableDiffs.length; i++) {
            domDiff.apply(tempPatchedNode, applicableDiffs[i].diff);
        }


        domDiff.apply(theDocumentValues.documentNode, domDiff.diff(nodeConverter.cleanNodeView(theDocumentValues.documentNode), nodeConverter.toView(tempPatchedNode)));

        diffHelpers.makeDiff(isUndo);
    };

    diffHelpers.orderAndApplyChanges = function () {
        var newestDiffs = [],
            patchDiff, tempCombinedNode, tempPatchedNode, i, applicableDiffs, containsCitation = false,
            containsEquation = false,
            containsComment = false,
            containsFootnote = false,
            containsTrackedchange = false;

        // Disable keyboard input while diffs are applied   
        theDocumentValues.disableInput = true;

        while (theDocumentValues.newDiffs.length > 0) {
            newestDiffs.push(theDocumentValues.newDiffs.pop());
        }
        newestDiffs = _.sortBy(newestDiffs, function (diff) {
            return diff.time;
        });

        while (newestDiffs.length > 0 && newestDiffs[0].time < theDocumentValues.textChangeList[theDocumentValues.textChangeList.length - 1][1]) {
            // We receive a change timed before the last change we recorded, so we need to go further back.
            theDocumentValues.textChangeList.pop();
            if (theDocumentValues.textChangeList.length === 0) {
                // We receive changes from before the first recorded version on this client. We need to reload the page.
                location.reload();
            }
            while (theDocumentValues.usedDiffs.length > 0 && theDocumentValues.usedDiffs[theDocumentValues.usedDiffs.length - 1].time > theDocumentValues.textChangeList[theDocumentValues.textChangeList.length - 1][1]) {
                newestDiffs.push(theDocumentValues.usedDiffs.pop());
            }
            newestDiffs = _.sortBy(newestDiffs, function (diff) {
                return diff.time;
            });

        }

        // We create a temporary node that has been patched with all changes so
        // that only the things that need to change from the node in the DOM
        // structure have to be touched.

        tempPatchedNode = theDocumentValues.textChangeList[theDocumentValues.textChangeList.length - 1][0].cloneNode(true);
        for (i = 0; i < newestDiffs.length; i++) {
            domDiff.apply(tempPatchedNode, newestDiffs[i].diff);
            if (newestDiffs[i].features[0]) {
                containsCitation = true;
            }
            if (newestDiffs[i].features[1]) {
                containsEquation = true;
            }
            if (newestDiffs[i].features[2]) {
                containsComment = true;
            }
            if (newestDiffs[i].features[3]) {
                containsFootnote = true;
            }            
            if (newestDiffs[i].features[4]) {
                containsTrackedchange = true;
            }
            theDocumentValues.usedDiffs.push(newestDiffs[i]);
        }
        theDocumentValues.textChangeList.push([tempPatchedNode, new Date().getTime() + window.clientOffsetTime]);

        // If we have keept more than 100 old document versions, discard the *second* one.  
        // If we really need something older, we will need to go back to the first, initial version and apply all changes.
        if (theDocumentValues.textChangeList.length > 100) {
            theDocumentValues.textChangeList.splice(1, 1);
        }

        // Now that the tempPatchedNode represents what the editor should look like, go ahead and apply only the differences, if there are any.

        applicableDiffs = domDiff.diff(nodeConverter.cleanNodeView(theDocumentValues.documentNode), nodeConverter.toView(tempPatchedNode));
        
        if (applicableDiffs.length > 0) {

            domDiff.apply(theDocumentValues.documentNode, applicableDiffs);
            theDocumentValues.diffNode = nodeConverter.toModel(theDocumentValues.documentNode);
            // Also make sure that placeholders correspond to the current state of affairs
            editorHelpers.setPlaceholders();
            // If something was done about citations, reformat these.
            if (containsCitation) {
                citationHelpers.formatCitationsInDoc();
            }
            // If something was changed about equations, recheck these.
            if (containsEquation) {
                mathHelpers.resetMath(mathHelpers.saveMathjaxElements);
            }
            // If new comments were added reformat these.
            if (containsComment) {
                commentHelpers.layoutComments();
            }
            // If footnotes were changed reformat these.
            if (containsFootnote) {
                nodeConverter.redoFootnotes();
            }            
            // If tracked changes are added, update tracker.
            if (containsTrackedchange) {
                tracker.findTrackTags();
            }
            editorHelpers.setDisplay.document('title', jQuery('#document-title').text().trim());
            // Mark the document as having changed to trigger saving, 
            // but don't mark it as having been touched so it doesn't trigger synchronization with peers.
            theDocumentValues.changed = true;
        }

        // Reenable keyboard input after diffs have been applied   
        theDocumentValues.disableInput = false;
    };

    diffHelpers.handleChanges = function () {
        if (theDocumentValues.touched) {
            theDocumentValues.touched = false;
            if (diffHelpers.makeDiff() && theDocumentValues.virgin) {
                document.querySelector('.icon-ccw').parentNode.parentNode.classList.remove('disabled');
                delete theDocumentValues.virgin;
            }
        } else if (theDocumentValues.newDiffs.length > 0) {
            try {
                diffHelpers.orderAndApplyChanges();
            } catch (err) {
                theDocumentValues.disableInput = true;
                serverCommunications.send({
                    type: 'get_document_update'
                });
            }
        }
    };

    diffHelpers.startCollaborativeMode = function () {
        theDocumentValues.collaborativeMode = true;
    };

    diffHelpers.stopCollaborativeMode = function () {
        diffHelpers.orderAndApplyChanges();
        theDocumentValues.collaborativeMode = false;
    };


    exports.diffHelpers = diffHelpers;
    exports.domDiff = domDiff;

}).call(this);