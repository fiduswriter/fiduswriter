/* Sets up communicating with server (retrieving document, saving, collaboration, etc.).
 */
export class WebSocketConnector {
    constructor({
        url = '', // needs to be specified
        appLoaded = () => false, // required argument
        anythingToSend = () => false, // required argument
        messagesElement = () => false, // element in which to show connection messages
        initialMessage = () => ({type: 'subscribe'}),
        resubScribed = () => {}, // Cleanup when the client connects a second or subsequent time
        restartMessage = () => ({type: 'restart'}), // Too many messages have been lost and we need to restart
        warningNotAllSent = gettext('Warning! Some data is unsaved'), // Info to show while disconnected WITH unsaved data
        infoDisconnected = gettext('Disconnected. Attempting to reconnect...'), // Info to show while disconnected WITHOUT unsaved data
        receiveData = _data => {},
        failedAuth = () => {
            window.location.href = "/"
        },
    }) {
        this.url = url
        this.appLoaded = appLoaded
        this.anythingToSend = anythingToSend
        this.messagesElement = messagesElement
        this.initialMessage = initialMessage
        this.resubScribed = resubScribed
        this.restartMessage = restartMessage
        this.warningNotAllSent = warningNotAllSent
        this.infoDisconnected = infoDisconnected
        this.receiveData = receiveData
        this.failedAuth = failedAuth
        /* A list of messages to be sent. Only used when temporarily offline.
            Messages will be sent when returning back online. */
        this.messagesToSend = []
        /* A list of messages from a previous connection */
        this.oldMessages = []

        this.online = true
        this.connected = false
        /* Increases when connection has to be reestablished */
        /* 0 = before first connection. */
        /* 1 = first connection established, etc. */
        this.connectionCount = 0
        this.recentlySent = false
        this.listeners = {}
    }

    init() {
        this.createWSConnection()

        // Close the socket manually for now when the connection is lost. Sometimes the socket isn't closed on disconnection.
        this.listeners.onOffline = _event => this.ws.close()
        window.addEventListener('offline', this.listeners.onOffline)
    }

    goOffline() {
        // Simulate offline mode due to lack of ways of doing this in Chrome/Firefox
        // https://bugzilla.mozilla.org/show_bug.cgi?id=1421357
        // https://bugs.chromium.org/p/chromium/issues/detail?id=423246
        this.online = false
        this.ws.close()
    }

    goOnline() {
        // Reconnect from offline mode
        this.online = true
    }

    close() {
        if (this.ws) {
            this.ws.onclose = () => {}
            this.ws.close()
        }
        window.removeEventListener('offline', this.listeners.onOffline)
    }

    createWSConnection() {
        // Messages object used to ensure that data is received in right order.
        this.messages = {
            server: 0,
            client: 0,
            lastTen: []
        }
        const url = this.online ?
            `${
                location.protocol === 'https:' ?
                    'wss://' :
                    'ws://'
            }${
                settings_WS_SERVER ?
                    settings_WS_SERVER :
                    location.host.split(':')[0]
            }${
                settings_WS_PORT ?
                    `:${settings_WS_PORT}` :
                    location.port.length ?
                        `:${location.port}` :
                        ''
            }${
                this.url
            }` :
            `${
                location.protocol === 'https:' ?
                    'wss://offline' :
                    'ws://offline'
            }`
        this.ws = new window.WebSocket(url)

        this.ws.onmessage = event => {
            const data = JSON.parse(event.data)
            const expectedServer = this.messages.server + 1
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
                    const clientDifference = this.messages.client - data.c
                    this.messages.client = data.c
                    if (clientDifference > this.messages.lastTen.length) {
                        // We cannot fix the situation
                        this.send(this.restartMessage)
                        return
                    }
                    this.messages['lastTen'].slice(0 - clientDifference).forEach(data => {
                        this.messages.client += 1
                        data.c = this.messages.client
                        data.s = this.messages.server
                        this.ws.send(JSON.stringify(data))
                    })
                    this.receive(data)
                }
            }
        }

        this.ws.onclose = () => {
            this.connected = false
            window.setTimeout(() => {
                this.createWSConnection()
            }, 2000)
            if (!this.appLoaded()) {
                // doc not initiated
                return
            }

            const messagesElement = this.messagesElement()
            if (messagesElement) {
                if (this.anythingToSend()) {
                    messagesElement.innerHTML =
                        `<span class="warn">${this.warningNotAllSent}</span>`
                } else {
                    messagesElement.innerHTML = this.infoDisconnected
                }

            }

        }
    }

    open() {
        const messagesElement = this.messagesElement()
        if (messagesElement) {
            messagesElement.innerHTML = ''
        }
        this.connected = true

        const message = this.initialMessage()
        this.connectionCount++
        this.oldMessages = this.messagesToSend
        this.messagesToSend = []

        this.send(() => (message))
    }

    subscribed() {
        if (this.connectionCount > 1) {
            this.resubScribed()
            while (this.oldMessages.length > 0) {
                this.send(this.oldMessages.shift())
            }
        }
    }

    /** Sends data to server or keeps it in a list if currently offline. */
    send(getData, timer = 80) {
        if (this.connected && !this.recentlySent) {
            const data = getData()
            if (!data) {
                // message is empty
                return
            }
            this.messages.client += 1
            data.c = this.messages.client
            data.s = this.messages.server
            this.messages.lastTen.push(data)
            this.messages.lastTen = this.messages['lastTen'].slice(-10)
            this.ws.send(JSON.stringify(data))
            this.setRecentlySentTimer(timer)
        } else {
            this.messagesToSend.push(getData)
        }
    }

    setRecentlySentTimer(timer) {
        this.recentlySent = true
        window.setTimeout(() => {
            this.recentlySent = false
            const oldMessages = this.messagesToSend
            this.messagesToSend = []
            while (oldMessages.length > 0) {
                const getData = oldMessages.shift()
                this.send(getData, Math.min(timer * 1.2, 10000))
            }
        }, timer)
    }

    resend_messages(from) {
        const toSend = this.messages.client - from
        this.messages.client = from
        if (toSend > this.messages.lastTen.length) {
            // Too many messages requested. Abort.
            this.send(this.restartMessage)
            return
        }
        this.messages.lastTen.slice(0 - toSend).forEach(data => {
            this.messages.client += 1
            data.c = this.messages.client
            data.s = this.messages.server
            this.ws.send(JSON.stringify(data))
        })
    }

    receive(data) {
        switch (data.type) {
        case 'welcome':
            this.open()
            break
        case 'subscribed':
            this.subscribed()
            break
        case 'access_denied':
            this.failedAuth()
            break
        default:
            this.receiveData(data)
            break
        }
    }

}
