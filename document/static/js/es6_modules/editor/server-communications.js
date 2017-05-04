/* Sets up communicating with server (retrieving document,
  saving, collaboration, etc.).
 */
export class ModServerCommunications {
    constructor(editor) {
        editor.mod.serverCommunications = this
        this.editor = editor
        /* A list of messages to be sent. Only used when temporarily offline.
        Messages will be sent when returning back online. */
        this.messagesToSend = []
        this.connected = false
        /* Whether the connection is established for the first time. */
        this.firstTimeConnection = true
    }

    init() {
        this.createWSConnection()
    }

    createWSConnection() {
        let websocketProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'

        try {

            this.ws = new window.WebSocket(`${websocketProtocol}//${window.websocketServer}${window.websocketPort}/ws/document/${this.editor.doc.id}`)
            console.log("this.ws", this.ws)
            this.ws.onopen = () => {
                jQuery('#unobtrusive_messages').html('')
            }
        } catch (err) {
            console.error(err)
        }


        this.ws.onmessage = event => {
            let data = JSON.parse(event.data)
            this.receive(data)
        }
        this.ws.onclose = event => {
            this.connected = false
            window.clearInterval(this.wsPinger)
            window.setTimeout(() => {
                this.createWSConnection()
            }, 2000)
            if (this.editor.pmCollab.hasSendableSteps()) {
                jQuery('#unobtrusive_messages').html('<span class="warn">' + gettext('Warning! Not all your changes have been saved! You could suffer data loss. Attempting to reconnect...') + '</span>')
            } else {
                jQuery('#unobtrusive_messages').html(gettext('Disconnected. Attempting to reconnect...'))
            }

        }
        this.wsPinger = window.setInterval(() => {
            this.send({
                'type': 'ping'
            })
        }, 50000)
    }

    activateConnection() {
        this.connected = true
        if (this.firstTimeConnection) {
            this.editor.waitingForDocument = false
            this.editor.askForDocument()
        } else {
            this.editor.mod.footnotes.fnEditor.renderAllFootnotes()
            this.editor.mod.collab.docChanges.checkDiffVersion()
            this.send({
                type: 'participant_update'
            })
            while (this.messagesToSend.length > 0) {
                this.send(this.messagesToSend.shift());
            }
        }
        this.firstTimeConnection = false
    }

    /** Sends data to server or keeps it in a list if currently offline. */
    send(data) {
        console.log("send", data)
        if (this.connected) {
            let a = this.ws.send(JSON.stringify(data))
            console.log("this connected", a)
        } else if (data.type !== 'diff') {
            this.messagesToSend.push(data)
        }
    }

    receive(data) {
        //console.log("recieve", data)
        switch (data.type) {
            case 'chat':
                this.editor.mod.collab.chat.newMessage(data)
                break
            case 'connections':
                this.editor.mod.collab.updateParticipantList(data.participant_list)
                break
            case 'welcome':
                this.activateConnection()
                break
            case 'doc_data':
                this.editor.receiveDocument(data)
                break
            case 'confirm_diff_version':
                this.editor.mod.collab.docChanges.cancelCurrentlyCheckingVersion()
                if (data.diff_version !== this.editor.pmCollab.version) {
                    this.editor.mod.collab.docChanges.checkDiffVersion()
                    return
                }
                this.editor.mod.collab.docChanges.enableDiffSending()
                break
            case 'selection_change':
                this.editor.mod.collab.docChanges.cancelCurrentlyCheckingVersion()
                if (data.diff_version !== this.editor.pmCollab.version) {
                    this.editor.mod.collab.docChanges.checkDiffVersion()
                    return
                }
                this.editor.mod.collab.carets.receiveSelectionChange(data)
                break
            case 'diff':
                this.editor.mod.collab.docChanges.receiveFromCollaborators(data)
                break
            case 'confirm_diff':
                this.editor.mod.collab.docChanges.confirmDiff(data.request_id)
                break
            case 'check_hash':
                this.editor.mod.collab.docChanges.checkHash(data.diff_version, data.hash)
                break
            case 'access_denied':
                window.location.href = '/'
                break
        }
    }

}
