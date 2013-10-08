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
            console.log(data);
            theDocument.newDiffs[data.field].push(data);
            break;
        case 'transform':
            editorHelpers.applyDocumentDataChanges(data);
            break;            
        case 'take_control':
            theDocument.localHistory = [];
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
    
    serverCommunications.resetOldFields = function () {
        var i;
        theDocument.oldFields = {};
        theDocument.oldFields.contents = theDocument.contents;
        
        theDocument.newDiffs = {};
        theDocument.newDiffs.contents = [];
        theDocument.usedDiffs = {};
        theDocument.usedDiffs.contents = [];
        for (i = 0; i < metadataFields.length;i++) {
            if (theDocument.metadata[metadataFields[i]]) {
                theDocument.oldFields[metadataFields[i]] = theDocument.metadata[metadataFields[i]];
            } else {
                theDocument.oldFields[metadataFields[i]] = '';
            }
            theDocument.newDiffs[metadataFields[i]] = [];
            theDocument.usedDiffs[metadataFields[i]] = [];
        }
    };
    
    serverCommunications.makeDiff = function (fieldName,fromString,toString) {
        return {
            type: 'diff',
            field: fieldName, 
            time: new Date().getTime(), 
            session: theDocument.sessionId, 
            diff: delta.Diff(fromString,toString)
        };
        
    };
    
    serverCommunications.updateEditField = function (field) {
        var theElement, theValue, beforeContents, beforeContentsWithCaret, caretDiff, savedSel;
        if (field==='title' || field=='contents') {
            theElement = document.getElementById('document-'+field);
        } else {
            theElement = document.getElementById('metadata-'+field);
        }
        if (field==='contents') {
            theValue=theDocument.contents;
        } else {
            theValue=theDocument.metadata[field];
        }
        
        beforeContents = theElement.innerHTML;
        
        savedSel = rangy.saveSelection();
        
        beforeContentsWithCaret = theElement.innerHTML;
        
        if (beforeContents!=beforeContentsWithCaret) {
            caretDiff = delta.Diff(beforeContents,beforeContentsWithCaret);
            theValue = delta.Patch(theValue,caretDiff);
        }
        theElement.innerHTML = theValue;
        rangy.restoreSelection(savedSel);
        
    };
    
    serverCommunications.orderAndApplyChanges = function (field) {
        var newestDiffs = [], fieldValue = theDocument.oldFields[field], patchDiff, i;
        
        while (theDocument.newDiffs[field].length > 0) {
            newestDiffs.push(theDocument.newDiffs[field].pop());
        }
        newestDiffs = _.sortBy(newestDiffs,function(diff){return diff.time;});
        
        
        if (theDocument.usedDiffs[field].length > 0) {
            while (newestDiffs[0].time < theDocument.usedDiffs[field][theDocument.usedDiffs[field].length-1].time) {
            // If the timestamp of the first of the newestDiffs is earlier than the last used, diff, we need to unpatch that and move the history backwards.
            // This happens if a diff that is older than 500 milliseconds reaches us.
                patchDiff = theDocument.usedDiffs[field].pop();
                fieldValue = delta.Unpatch(fieldValue,patchDiff.diff);
                newestDiffs.push(patchDiff);
                newestDiffs = _.sortBy(newestDiffs,function(diff){return diff.time;});
            }
        }
        for (i = 0; i < newestDiffs.length; i++) {
            fieldValue = delta.Patch(fieldValue,newestDiffs[i].diff);
            theDocument.usedDiffs[field].push(newestDiffs[i]);
        }
        theDocument.oldFields[field] = fieldValue;
        if (field==='contents') {
            theDocument.contents = fieldValue;
        } else {
            theDocument.metadata[field] = fieldValue;
        }
        serverCommunications.updateEditField(field);
    };
    
    serverCommunications.createDiffs = function () {
        var diff;
        if (theDocument.oldFields.contents != theDocument.contents) {
            diff = serverCommunications.makeDiff('contents', theDocument.oldFields.contents, theDocument.contents);
            serverCommunications.send(diff);
            if (theDocument.newDiffs.contents.length===0) {
                // There are no new changes from anywhere else, but there are local changes
                // Copy the new data to old data and update the time.
                theDocument.oldFields.contents = theDocument.contents;
            } else {
                // There are both local and remote changes. Integrate them!
                theDocument.newDiffs.contents.push(diff);
                serverCommunications.orderAndApplyChanges('contents');
            }
            
        } else if (theDocument.newDiffs.contents.length > 0) {
            serverCommunications.orderAndApplyChanges('contents');
        }
        for (var i =0; i < metadataFields.length;i++) {
            if (theDocument.metadata[metadataFields[i]] && theDocument.oldFields[metadataFields[i]] != theDocument.metadata[metadataFields[i]]) {
                diff = serverCommunications.makeDiff(metadataFields[i], theDocument.oldFields[metadataFields[i]], theDocument.metadata[metadataFields[i]]);
                serverCommunications.send(diff);
                if (theDocument.newDiffs[metadataFields[i]].length===0) {
                    // There are no new changes from anywhere else, but there are local changes
                    // Copy the new data to old data and update the time.
                    theDocument.oldFields[metadataFields[i]] = theDocument.metadata[metadataFields[i]];
                } else {
                    // There are both local and remote changes. Integrate them!
                    theDocument.newDiffs[metadataFields[i]].push(diff);
                    serverCommunications.orderAndApplyChanges(metadataFields[i]);
                }
                
            } else if (theDocument.newDiffs[metadataFields[i]].length > 0) {
                serverCommunications.orderAndApplyChanges(metadataFields[i]);
            }
        }
    };
    
    serverCommunications.incorporateUpdates = function () {
        if (theDocument.changed) {
            theDocument.changed = false;
            editorHelpers.getUpdatesFromInputFields();
            serverCommunications.createDiffs();
        } else {
            if (theDocument.newDiffs.contents.length > 0) {
                serverCommunications.orderAndApplyChanges('contents');
            }
            for (var i=0; i < metadataFields.length;i++) {
                if (theDocument.newDiffs[metadataFields[i]].length > 0) {
                    serverCommunications.orderAndApplyChanges(metadataFields[i]);
                }
            }
        }
    };

    serverCommunications.startCollaborativeMode = function () {
        editorHelpers.getUpdatesFromInputFields(
            function () {
                serverCommunications.resetOldFields();
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