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
         * @namespace serverCommunications
         */
        serverCommunications = {};

    serverCommunications.send = function (data) {
        ws.send(JSON.stringify(data));
    };

    serverCommunications.receive = function (data) {
        switch (data.type) {
        case 'chat':
            chatHelpers.newMessage(data);
            break;
        case 'connections':
            //console.log(data);
            serverCommunications.updateParticipantList(data.participant_list);
            break;
        case 'welcome':
            editorHelpers.fillEditorPage(data.document);
            if (data.hasOwnProperty('user')) {
                theUser = data.user;
            } else {
                theUser = theDocument.owner;
            }
            jQuery.event.trigger({
                type: "documentDataLoaded",
            });

            theDocument.sessionId = data.session_id;

            if (data.hasOwnProperty('control')) {
                theDocument.enableSave = true;
            } else {
                theDocument.enableSave = false;
            }
            break;
        case 'diff':
            theDocument.newDiffs.push(data);
            break;
        case 'transform':
            editorHelpers.setDocumentData(data.change[0], data.change[1], false);
            editorHelpers.setDisplay.document(data.change[0], data.change[1]);
            break;
        case 'take_control':
            theDocument.enableSave = true;
        }
    };

    serverCommunications.updateParticipantList = function (participant_list) {
        window.uniqueParticipantList = _.map(_.groupBy(participant_list,
            'id'), function (entry) {
            return entry[0]
        });
        if (participant_list.length > 1 && (!theDocument.collaborativeMode)) {
            serverCommunications.startCollaborativeMode();
        } else if (participant_list.length === 1 && theDocument.collaborativeMode) {
            serverCommunications.stopCollaborativeMode();
        }
        chatHelpers.updateParticipantList(participant_list);
    };

    var metadataFields = ['title', 'subtitle', 'abstract', 'authors', 'keywords'];

    serverCommunications.resetTextChangeList = function () {
        theDocument.newDiffs = [];
        theDocument.usedDiffs = [];
        theDocument.textChangeList = [];
        serverCommunications.addCurrentToTextChangeList();
        serverCommunications.diffNode = document.getElementById('document-editable').cloneNode(true); // a node against which changes are tested constantly.
    };

    serverCommunications.addCurrentToTextChangeList = function () {
        theDocument.textChangeList.push([document.getElementById('document-editable').cloneNode(true), new Date().getTime() + window.clientOffsetTime]);
    };


    serverCommunications.makeDiff = function () {
        var theDiff = domDiff.diff(serverCommunications.diffNode, document.getElementById('document-editable')),
            containsCitation = 0,
            containsEquation = 0,
            containsComment = 0,
            diffText = '',
            i;

        if (theDiff.length === 0) {
            return;
        }
        //console.log(theDiff);
        domDiff.apply(serverCommunications.diffNode, theDiff);
        for (i = 0; i < theDiff.length; i++) {
            if (theDiff[i].hasOwnProperty('element')) {
                diffText = theDiff[i]['element'];
            } else if (theDiff[i].hasOwnProperty('oldValue') && theDiff[i].hasOwnProperty('newValue')) {
                diffText = theDiff[i]['oldValue'] + theDiff[i]['newValue'];
            }
            //console.log(theDiff[i]);
            if (diffText.indexOf('citation') != -1) {
                containsCitation = 1;
            }
            if (diffText.indexOf('equation') != -1) {
                containsEquation = 1;
            }
            if (diffText.indexOf('comment') != -1) {
                containsComment = 1;
            }
        }

        var thePackage = {
            type: 'diff',
            time: new Date().getTime() + window.clientOffsetTime,
            diff: theDiff,
            features: [containsCitation, containsEquation, containsComment]
        };

        serverCommunications.send(thePackage);
        theDocument.newDiffs.push(thePackage);
        serverCommunications.orderAndApplyChanges();
    };

    serverCommunications.orderAndApplyChanges = function () {
        var newestDiffs = [],
            patchDiff, tempCombinedNode, tempPatchedNode, i, applicableDiffs, containsCitation = false,
            containsEquation = false,
            containsComment = false;

        while (theDocument.newDiffs.length > 0) {
            newestDiffs.push(theDocument.newDiffs.pop());
        }
        newestDiffs = _.sortBy(newestDiffs, function (diff) {
            return diff.time;
        });


        while (newestDiffs[0].time < theDocument.textChangeList[theDocument.textChangeList.length - 1][1]) {
            // We receive a change timed before the last change we recorded, so we need to go further back.
            theDocument.textChangeList.pop();
            if (theDocument.textChangeList.length === 0) {
                // We receive changes from before the first recorded version on this client. We need to reload the page.
                location.reload();
            }
            while (theDocument.usedDiffs.length > 0 && theDocument.usedDiffs[theDocument.usedDiffs.length - 1].time > theDocument.textChangeList[theDocument.textChangeList.length - 1][1]) {
                newestDiffs.push(theDocument.usedDiffs.pop());
            }
            newestDiffs = _.sortBy(newestDiffs, function (diff) {
                return diff.time;
            });

        }

        // We create a temporary node that has been patched with all changes so
        // that only the things that need to change from the node in the DOM
        // structure have to be touched.
        tempPatchedNode = theDocument.textChangeList[theDocument.textChangeList.length - 1][0].cloneNode(true);

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
            theDocument.usedDiffs.push(newestDiffs[i]);
        }
        theDocument.textChangeList.push([tempPatchedNode, new Date().getTime() + window.clientOffsetTime]);

        // If we have keept more than 10 old document versions, discard the first one. We should never need that older versions anyway.
        if (theDocument.textChangeList.length > 10) {
            theDocument.textChangeList.shift();
        }

        // Now that the tempPatchedNode represents what the editor should look like, go ahead and apply only the differences, if there are any.

        applicableDiffs = domDiff.diff(document.getElementById('document-editable'), tempPatchedNode);

        if (applicableDiffs.length > 0) {

            domDiff.apply(document.getElementById('document-editable'), applicableDiffs);

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
        }
    };

    serverCommunications.incorporateUpdates = function () {
        if (theDocument.touched) {
            theDocument.touched = false;
            serverCommunications.makeDiff();
        } else if (theDocument.newDiffs.length > 0) {
            serverCommunications.orderAndApplyChanges();
        }
    };

    serverCommunications.startCollaborativeMode = function () {
        theDocument.touched = false;
        editorHelpers.getUpdatesFromInputFields(
            function () {
                serverCommunications.resetTextChangeList();
            }
        );
        serverCommunications.collaborateTimer = setInterval(serverCommunications.incorporateUpdates, 500);
        theDocument.collaborativeMode = true;
    };

    serverCommunications.stopCollaborativeMode = function () {
        clearInterval(serverCommunications.collaborateTimer);
        theDocument.collaborativeMode = false;
    };
    /** When the connection to the server has been lost, notify the user and ask to reload page. */
    serverCommunications.noConnectionToServer = function () {

        var noConnectionDialog = document.createElement('div');
        noConnectionDialog.id = 'no-connection-dialog';
        noConnectionDialog.innerHTML = '<p>' + gettext(
            'Sorry, but the connection to the server has been lost. Please reload to ensure that no date is being lost.'
        ) +
            '</p>';

        document.body.appendChild(noConnectionDialog);
        diaButtons = {};

        diaButtons[gettext('Ok')] = function () {
            jQuery(this).dialog("close");
        };


        jQuery("#no-connection-dialog").dialog({
            resizable: false,
            width: 400,
            height: 180,
            modal: true,
            buttons: diaButtons,
            autoOpen: true,
            title: gettext('No connection to server'),
            create: function () {
                var $the_dialog = jQuery(this).closest(".ui-dialog");
                $the_dialog.find(".ui-button:first-child").addClass(
                    "dark");
            },
            close: function () {
                location.reload();
            },
        });

        setTimeout(function () {
            location.reload();
        }, 20000);
    };

    /** Tries to measure the time offset between cleint and server as change diffs will be submitted using the clients time. */
    serverCommunications.getClientTimeOffset = function (clientOffsetTimeTrials) {
        var request = new XMLHttpRequest(),
            startTime = Date.now();
        request.open('HEAD', '/hello-tornado', false);
        request.onreadystatechange = function () {
            var timeNow = Date.now(),
                latency = timeNow - startTime,
                serverTime = new Date(request.getResponseHeader('DATE')),
                offset = (serverTime.getTime() + (latency / 2)) - timeNow;
            if (!clientOffsetTimeTrials) {
                clientOffsetTimeTrials = [];
            }
            clientOffsetTimeTrials.push(offset);
            if (clientOffsetTimeTrials.length < 5) {
                serverCommunications.getClientTimeOffset(clientOffsetTimeTrials);
            } else {
                var total = clientOffsetTimeTrials.reduce(function (a, b) {
                    return a + b
                });
                window.clientOffsetTime = parseInt(total / clientOffsetTimeTrials.length);
                delete clientOffsetTimeTrials;
            }
        };
        request.send(null);
    };



    serverCommunications.bind = function () {
        window.theDocument = undefined;
        window.theUser = undefined;
        window.clientOffsetTime = 0;
        jQuery(document).ready(function () {
            var pathnameParts = window.location.pathname.split('/'),
                documentId = parseInt(pathnameParts[pathnameParts.length -
                    2], 10);

            serverCommunications.getClientTimeOffset();

            if (isNaN(documentId)) {
                documentId = 0;
            }
            window.ws = new WebSocket('ws://' + location.host +
                '/ws/doc/' + documentId);
            ws.onmessage = function (event) {
                //console.log(event);
                serverCommunications.receive(JSON.parse(event.data));
            }
            ws.onclose = serverCommunications.noConnectionToServer;
        });
    };

    exports.serverCommunications = serverCommunications;

}).call(this);