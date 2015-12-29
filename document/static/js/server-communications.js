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

    serverCommunications.connected = false;

    /** A list of messages to be sent. Only used when temporarily offline. Messages will be sent when returning back online. */
    serverCommunications.messagesToSend = [];


    serverCommunications.activate_connection = function () {
        serverCommunications.connected = true;
        while (serverCommunications.messagesToSend.length > 0) {
            serverCommunications.send(serverCommunications.messagesToSend.shift());
        }
        if (serverCommunications.firstTimeConnection) {
            serverCommunications.send({
                type: 'get_document'
            });
        } else {
            serverCommunications.send({
                type: 'participant_update'
            });
        }
        serverCommunications.firstTimeConnection = false;
    };

    /** Sends data to server or keeps it in a list if currently offline. */
    serverCommunications.send = function (data) {
        if (serverCommunications.connected) {
            ws.send(JSON.stringify(data));
        } else {
            serverCommunications.messagesToSend.push(data);
        }
    };

    serverCommunications.receive = function (data) {
        switch (data.type) {
        case 'chat':
            chatHelpers.newMessage(data);
            break;
        case 'connections':
            serverCommunications.updateParticipantList(data.participant_list);
            if (theDocumentValues.control) {
                theDocumentValues.sentHash = false;
            }
            break;
        case 'welcome':
            serverCommunications.activate_connection();
            break;
        case 'document_data':
            editorHelpers.fillEditorPage(data.document, data.document_values);
            if (data.hasOwnProperty('user')) {
                theUser = data.user;
            } else {
                theUser = theDocument.owner;
            }
            jQuery.event.trigger({
                type: "documentDataLoaded",
            });
            serverCommunications.send({
                type: 'participant_update'
            });
            break;
        case 'document_data_update':
            editorHelpers.updateEditorPage(data.document);
            break;
        case 'diff':
            theEditor.applyDiffs(data);
            break;
        case 'transform':
            editorHelpers.setDocumentData(data.change[0], data.change[1], false);
            editorHelpers.setDisplay.document(data.change[0], data.change[1]);
            break;
        case 'take_control':
            theDocumentValues.control = true;
            theDocumentValues.sentHash = false;
            break;
        case 'hash':
            theEditor.checkHash(data.hash);
            break;
        }
    };

    serverCommunications.updateParticipantList = function (participant_list) {
        window.uniqueParticipantList = _.map(_.groupBy(participant_list,
            'id'), function (entry) {
            return entry[0];
        });
        if (participant_list.length > 1 && (!theDocumentValues.collaborativeMode)) {
            theEditor.startCollaborativeMode();
        } else if (participant_list.length === 1 && theDocumentValues.collaborativeMode) {
            theEditor.stopCollaborativeMode();
        }
        chatHelpers.updateParticipantList(participant_list);
    };


    /** If the connection to the server has been lost, notify the user and ask to reload page. */
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

    /** Whether the connection is established for the first time. */
    serverCommunications.firstTimeConnection = true;

    serverCommunications.bind = function () {
        var pathnameParts = window.location.pathname.split('/');
        window.theDocument = undefined;
        window.theDocumentValues = {};
        window.theUser = undefined;
        window.clientOffsetTime = 0;
        window.documentId = parseInt(pathnameParts[pathnameParts.length -
            2], 10);

        if (isNaN(documentId)) {
            documentId = 0;
        }

        jQuery(document).ready(function () {

            serverCommunications.getClientTimeOffset();

            var wsConnectionAttempts = 0;

            function createWSConnection() {
                var connectTime = new Date(),
                    wsPinger;

                window.ws = new WebSocket('ws://' + websocketServer + ':' + websocketPort +
                    '/ws/doc/' + documentId);

                wsPinger = setInterval(function () {
                    serverCommunications.send({
                        'type': 'ping'
                    })
                }, 50000);

                ws.onmessage = function (event) {
                    var data = JSON.parse(event.data);
                    serverCommunications.receive(data);
                }
                ws.onclose = function (event) {
                    serverCommunications.connected = false;

                    var currentTime = new Date();
                    clearInterval(wsPinger);
                    if (currentTime - connectTime > 10000) {
                        wsConnectionAttempts = 0;
                        createWSConnection();
                    } else if (wsConnectionAttempts < 10) {
                        wsConnectionAttempts++;
                        setTimeout(createWSConnection, 2000);
                        console.log('attempting to reconnect');
                    } else {
                        wsConnectionAttempts = 0;
                        serverCommunications.noConnectionToServer();
                    }
                }
            }
            createWSConnection();

        });



    };

    exports.serverCommunications = serverCommunications;

}).call(this);
