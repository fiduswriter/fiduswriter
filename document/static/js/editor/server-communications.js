
(function () {
    var exports = this,
        /** Sets up communicating with server (retrieving document, saving, collaboration, etc.). TODO
         * @namespace serverCommunications
         */
        serverCommunications = {};

    serverCommunications.connected = false;

    /** A list of messages to be sent. Only used when temporarily offline. Messages will be sent when returning back online. */
    serverCommunications.messagesToSend = [];


    serverCommunications.activateConnection = function () {
        serverCommunications.connected = true;
        if (serverCommunications.firstTimeConnection) {
            theEditor.waitingForDocument = false;
            theEditor.askForDocument();
        } else {
            theEditor.mod.footnotes.fnEditor.renderAllFootnotes();
            theEditor.checkDiffVersion();
            serverCommunications.send({
                type: 'participant_update'
            });
            while (serverCommunications.messagesToSend.length > 0) {
                  serverCommunications.send(serverCommunications.messagesToSend.shift());
            }
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
            serverCommunications.activateConnection();
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
        case 'confirm_diff_version':
            theEditor.cancelCurrentlyCheckingVersion();
            if (data.diff_version !== theEditor.pm.mod.collab.version) {
                theEditor.checkDiffVersion();
                return;
            }
            theEditor.enableDiffSending();
        case 'diff':
            if (theEditor.waitingForDocument) {
                // We are currently waiting for a complete editor update, so
                // don't deal with incoming diffs.
                return;
            }
            var editorHash = theEditor.getHash();
            console.log('Incoming diff: version: '+data.diff_version+', hash: '+data.hash);
            console.log('Editor: version: '+theEditor.pm.mod.collab.version+', hash: '+editorHash);
            if (data.diff_version !== theEditor.pm.mod.collab.version) {
                console.warn('Something is not correct. The local and remote versions do not match.');
                theEditor.checkDiffVersion();
                return;
            } else {
                console.log('version OK')
            }
            if (data.hash && data.hash !== editorHash) {
                console.warn('Something is not correct. The local and remote hash values do not match.');
                return false;
            }
            if (data.comments && data.comments.length) {
                theEditor.updateComments(data.comments, data.comments_version);
            }
            if (data.diff && data.diff.length) {
              data.diff.forEach(function(diff) {
                  theEditor.applyDiff(diff);
              })
            }
            if (data.footnote_diff && data.footnote_diff.length) {
                theEditor.mod.footnotes.fnEditor.applyDiffs(data.footnote_diff);
            }
            if (data.reject_request_id) {
                theEditor.rejectDiff(data.reject_request_id);
            }
            if (!data.hash) {
                // No hash means this must have been created server side.
                theEditor.cancelCurrentlyCheckingVersion();
                theEditor.enableDiffSending();
                // Because the uypdate came directly from the sevrer, we may
                // also have lost some collab updates to the footnote table.
                // Re-render the footnote table if needed.
                theEditor.mod.footnotes.fnEditor.renderAllFootnotes();
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
            theEditor.checkHash(data.diff_version, data.hash);
            break;
        }
    };

    serverCommunications.updateParticipantList = function (participant_list) {
        window.uniqueParticipantList = _.map(_.groupBy(participant_list,
            'id'), function (entry) {
            return entry[0];
        });
        if (participant_list.length > 1 && (!theEditor.collaborativeMode)) {
            theEditor.collaborativeMode = true;
        } else if (participant_list.length === 1 && theEditor.collaborativeMode) {
            theEditor.collaborativeMode = false;
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
