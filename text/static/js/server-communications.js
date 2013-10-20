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
            serverCommunications.updateParticipantList(data.participant_list);
            break;
        case 'welcome':
            editorHelpers.fillEditorPage(data.document);
            if (data.hasOwnProperty('user')) {
                theUser = data.user;
            }
            else {
                theUser = theDocument.owner;
            }
            jQuery.event.trigger({
                type: "documentDataLoaded",
            });

            theDocument.sessionId = data.session_id;

            if (data.hasOwnProperty('control')) {
                theDocument.enableSave = true;
            }
            else {
                theDocument.enableSave = false;
            }
            break;
        case 'diff':
            theDocument.newDiffs.push(data);
            break;
        case 'transform':
            editorHelpers.applyDocumentDataChanges(data);
            break;            
        case 'take_control':
           // theDocument.localHistory = [];
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
        }
        else if (participant_list.length === 1 && theDocument.collaborativeMode) {
            serverCommunications.stopCollaborativeMode();
        }
        chatHelpers.updateParticipantList(participant_list);
    };
    
    var metadataFields = ['title','subtitle','abstract'];
    
    serverCommunications.resetTextChangeList = function () {
        theDocument.newDiffs = [];
        theDocument.usedDiffs = [];
        theDocument.textChangeList = [];
        serverCommunications.addCurrentToTextChangeList();
    };
    
    serverCommunications.addCurrentToTextChangeList = function () {
        theDocument.textChangeList.push([document.getElementById('document-editable').cloneNode(true),new Date().getTime()]);
    };
    
    
    serverCommunications.makeDiff = function () {
        console.log(theDocument.textChangeList[theDocument.textChangeList.length-1][0]);
        var theDiff = domDiff.diff(theDocument.textChangeList[theDocument.textChangeList.length-1][0],document.getElementById('document-editable'));
        console.log(theDiff);
        var thePackage = {
            type: 'diff',
            time: new Date().getTime(), 
            session: theDocument.sessionId, 
            diff: theDiff
        };
        
        serverCommunications.send(thePackage);
        theDocument.newDiffs.push(thePackage);
        serverCommunications.orderAndApplyChanges();
    };
    
    serverCommunications.orderAndApplyChanges = function () {
        var newestDiffs = [], patchDiff, tempCombinedNode, i;
        
        while (theDocument.newDiffs.length > 0) {
            newestDiffs.push(theDocument.newDiffs.pop());
        }
        newestDiffs = _.sortBy(newestDiffs,function(diff){return diff.time;});
        
        
        while (newestDiffs[0].time < theDocument.textChangeList[theDocument.textChangeList.length-1][1]) {
            // We receive a change timed before the last change we recorded, so we need to go further back.
            theDocument.textChangeList.pop();
            if (theDocument.textChangeList.length===0) {
                // We receive changes from before the first recorded version on this client. We need to reload the page.
                location.reload();
            }
            while(theDocument.usedDiffs[theDocument.usedDiffs.length-1].time > theDocument.textChangeList[theDocument.textChangeList.length-1][1]) {
                newestDiffs.push(theDocument.usedDiffs.pop());
            }
            newestDiffs = _.sortBy(newestDiffs,function(diff){return diff.time;});
                
        }
        
        // We create a temporary node that has been patched with all changes so
        // that only the things that need to change from the node in the DOM
        // structure have to be touched.
        tempPatchedNode = theDocument.textChangeList[theDocument.textChangeList.length-1][0].cloneNode(true);
        
        for (i = 0; i < newestDiffs.length; i++) {
            domDiff.patch(tempPatchedNode,newestDiffs[i].diff);
            theDocument.usedDiffs.push(newestDiffs[i]);
        }
        theDocument.textChangeList.push([tempPatchedNode,new Date().getTime()]);
        // Now that the tempPatchedNode represents what the editor should look like, go ahead and apply only the differences.
        
        domDiff.patch(document.getElementById('document-editable'), domDiff.diff(document.getElementById('document-editable'), tempPatchedNode));
        
    };
    
    serverCommunications.incorporateUpdates = function () {
        if (theDocument.changed) {
            theDocument.changed = false;
            serverCommunications.makeDiff();
        } else if (theDocument.newDiffs.length > 0) {
            serverCommunications.orderAndApplyChanges();
        }
    };

    serverCommunications.startCollaborativeMode = function () {
        editorHelpers.getUpdatesFromInputFields(
            function () {
                serverCommunications.resetTextChangeList();
            }
        );
        serverCommunications.collaborateTimer = setInterval(serverCommunications.incorporateUpdates,500);
        theDocument.collaborativeMode = true;
    };

    serverCommunications.stopCollaborativeMode = function () {
        clearInterval(serverCommunications.collaborateTimer);
        theDocument.collaborativeMode = false;
    };

    serverCommunications.noConnectionToServer = function () {
        // If we come right out fo the print dialog, permit immediate reloading.
        if (toPrint) location.reload();

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


    serverCommunications.bind = function () {
        window.theDocument = undefined;
        window.theUser = undefined;
        jQuery(document).ready(function () {
            var pathnameParts = window.location.pathname.split('/'),
                documentId = parseInt(pathnameParts[pathnameParts.length -
                    2], 10);

            if (isNaN(documentId)) {
                documentId = 0;
            }
            window.ws = new WebSocket('ws://' + location.host +
                '/ws/doc/' + documentId);
            ws.onmessage = function (event) {
                serverCommunications.receive(JSON.parse(event.data));
            }
            ws.onclose = serverCommunications.noConnectionToServer;
        });
    };

    exports.serverCommunications = serverCommunications;

}).call(this);