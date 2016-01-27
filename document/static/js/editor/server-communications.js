
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
        if (serverCommunications.firstTimeConnection) {
            serverCommunications.send({
                type: 'get_document'
            });
        } else {
            serverCommunications.send({
                type: 'check_version',
                version: theEditor.editor.mod.collab.version
            });
            serverCommunications.send({
                type: 'participant_update'
            });
            while (serverCommunications.messagesToSend.length > 0) {
                  serverCommunications.send(serverCommunications.messagesToSend.shift());
            }
            theEditor.sendToCollaborators();

        }
        serverCommunications.firstTimeConnection = false;
    };

    /** Sends data to server or keeps it in a list if currently offline. */
    serverCommunications.send = function (data) {
        if (serverCommunications.connected) {
            ws.send(JSON.stringify(data));
        } else if (data.type !== 'diff') {
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
            editorHelpers.copyDocumentValues(data.document, data.document_values);
            if (data.hasOwnProperty('user')) {
                theUser = data.user;
            } else {
                theUser = theDocument.owner;
            }
            usermediaHelpers.init(function(){
                theEditor.update();
                serverCommunications.send({
                    type: 'participant_update'
                });
            });
            break;
        case 'diff':
            if (data.comments && data.comments.length) {
              theEditor.updateComments(data.comments, data.comments_version);
            }
            if (data.diff && data.diff.length) {
              data.diff.forEach(function(diff) {
                  theEditor.applyDiff(diff);
              })

            }
            break;
        case 'confirm_diff':
            theEditor.confirmDiff(data.request_id);
            break;
        case 'setting_change':
            editorHelpers.setSetting(data.variable, data.value, false);
            editorHelpers.displaySetting.set(data.variable);
            break;
        case 'take_control':
            theDocumentValues.control = true;
            theDocumentValues.sentHash = false;
            break;
        case 'check_hash':
            theEditor.checkHash(data.version,data.hash);
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

            function createWSConnection() {
                var wsPinger;

                try {
                    window.ws = new WebSocket('ws://' + websocketServer + ':' + websocketPort +
                      '/ws/doc/' + documentId);
                    ws.onopen = function () {
                      console.log('connection open');
                      jQuery('#unobtrusive_messages').html('');
                    };
                } catch (err) {
                    console.log(err)
                }


                ws.onmessage = function (event) {
                    var data = JSON.parse(event.data);
                    serverCommunications.receive(data);
                }
                ws.onclose = function (event) {
                    serverCommunications.connected = false;
                    clearInterval(wsPinger);
                    setTimeout(createWSConnection, 2000);
                    console.log('attempting to reconnect');
                    jQuery('#unobtrusive_messages').html(gettext('Disconnected. Attempting to reconnect...'))
                }
                wsPinger = setInterval(function () {
                    serverCommunications.send({
                        'type': 'ping'
                    })
                }, 50000);
            }
            createWSConnection();
        });



    };

    exports.serverCommunications = serverCommunications;

}).call(this);
