import {sendableSteps} from "prosemirror-collab"

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
        // Messages object used to ensure that data is received in right order.
        this.messages = {
            server: 0,
            client: 0,
            lastTen: []
        }
        try {
            this.ws = new window.WebSocket(`${websocketProtocol}//${window.websocketServer}${window.websocketPort}/ws/document/${this.editor.docInfo.id}`)
            this.ws.onopen = () => {
                jQuery('#unobtrusive_messages').html('')
            }
        } catch (err) {
            console.error(err)
        }


        this.ws.onmessage = event => {
            let data = JSON.parse(event.data)
            let expectedServer = this.messages.server + 1
            console.log({data, expectedServer})
            if (data.type === 'request_resend') {
                this.resend_messages(data.from)
            } else if (data.s < expectedServer) {
                // Receive a message already received at least once. Ignore.
                return
            } else if (data.s > expectedServer) {
                // Messages from the server have been lost.
                // Request resend.
                this.ws.send(JSON.stringify({
                    type: 'request_resend',
                    from: this.messages.server
                }))
            } else {
                this.messages.server = expectedServer
                if (data.c === this.messages.client) {
                    this.receive(data)
                } else if (data.c < this.messages.client) {
                    // We have received all server messages, but the server seems
                    // to have missed some of the client's messages. They could
                    // have been sent simultaneously.
                    // The server wins over the client in this case.
                    let clientDifference = this.messages.client - data.c
                    this.messages.client = data.c
                    if (clientDifference > this.messages.lastTen.length) {
                        // We cannot fix the situation
                        this.send(() =>({type: 'get_document'}))
                        return
                    }
                    this.messages['lastTen'].slice(0-clientDifference).forEach(getData => {
                        let data = getData()
                        if (!data) {
                            // message is empty
                            return
                        }
                        this.messages.client += 1
                        data.c = this.messages.client
                        data.s = this.messages.server
                        console.log({type:'resend',data})
                        this.ws.send(JSON.stringify(data))
                    })
                    this.receive(data)
                }
            }
        }

        this.ws.onclose = event => {
            this.connected = false
            window.clearInterval(this.wsPinger)
            window.setTimeout(() => {
                this.createWSConnection()
            }, 2000)
            if(!this.editor.view.state.plugins.length) {
                console.warn('doc not initiated')
                return
            }
            let toSend = sendableSteps(this.editor.view.state)
            if (toSend) {
                jQuery('#unobtrusive_messages').html('<span class="warn">'+gettext('Warning! Not all your changes have been saved! You could suffer data loss. Attempting to reconnect...')+'</span>')
            } else {
                jQuery('#unobtrusive_messages').html(gettext('Disconnected. Attempting to reconnect...'))
            }

        }
        this.wsPinger = window.setInterval(() => {
            this.send(() => ({
                'type': 'ping'
            }))
        }, 50000)
    }

    activateConnection() {
        this.connected = true
        if (this.firstTimeConnection) {
            this.editor.waitingForDocument = false
            this.editor.askForDocument()
        } else {
            this.editor.mod.footnotes.fnEditor.renderAllFootnotes()
            this.editor.mod.collab.docChanges.checkVersion()
            this.send(() => ({
                type: 'participant_update'
            }))
            while (this.messagesToSend.length > 0) {
                this.send(this.messagesToSend.shift())
            }
        }
        this.firstTimeConnection = false
    }

    /** Sends data to server or keeps it in a list if currently offline. */
    send(getData) {
        if (this.connected) {
            let data = getData()
            if (!data) {
                // message is empty
                return
            }
            this.messages.client += 1
            data.c = this.messages.client
            data.s = this.messages.server
            this.messages.lastTen.push(getData)
            this.messages.lastTen = this.messages['lastTen'].slice(-10)
            console.log({data})
            this.ws.send(JSON.stringify(data))
        } else {
            this.messagesToSend.push(getData)
        }
    }

    resend_messages(from) {
        let toSend = this.messages.client - from
        this.messages.client = from
        if (toSend > this.messages.lastTen.length) {
            // Too many messages requested. Abort.
            this.send(() => ({type: 'get_document'}))
            return
        }
        this.messages.lastTen.slice(0-toSend).forEach(getData => {
            this.messages.client += 1
            let data = getData()
            if (!data) {
                // message is empty
                return
            }
            data.c = this.messages.client
            data.s = this.messages.server
            console.log({data})
            this.ws.send(JSON.stringify(data))
        })
    }

    receive(data) {
        switch (data.type) {
            case 'chat':
                this.editor.mod.collab.chat.newMessage(data)
                break
            case 'connections':
                this.editor.mod.collab.updateParticipantList(data.participant_list)
                break
            case 'welcome':
                this.editor.mod.styles.setStyles(data.styles)
                this.activateConnection()
                break
            case 'doc_data':
                this.editor.receiveDocument(data)
                break
            case 'confirm_version':
                this.editor.mod.collab.docChanges.cancelCurrentlyCheckingVersion()
                if (data["v"] !== this.editor.docInfo.version) {
                    this.editor.mod.collab.docChanges.checkVersion()
                    return
                }
                this.editor.mod.collab.docChanges.enableDiffSending()
                break
            case 'selection_change':
                this.editor.mod.collab.docChanges.cancelCurrentlyCheckingVersion()
                if (data["v"] !== this.editor.docInfo.version) {
                    this.editor.mod.collab.docChanges.checkVersion()
                    return
                }
                this.editor.mod.collab.docChanges.receiveSelectionChange(data)
                break
            case 'diff':
                if (data["v"] !== this.editor.docInfo.version) {
                    this.editor.mod.collab.docChanges.checkVersion()
                    return
                }
                this.editor.mod.collab.docChanges.receiveFromCollaborators(data)
                break
            case 'confirm_diff':
                this.editor.mod.collab.docChanges.confirmDiff(data["rid"])
                break
            case 'reject_diff':
                this.editor.mod.collab.docChanges.rejectDiff(data["rid"])
                break
            case 'access_denied':
                window.location.href = '/'
                break
        }
    }

}
