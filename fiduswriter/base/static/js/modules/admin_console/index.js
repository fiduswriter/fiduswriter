import {findTarget, addAlert, whenReady, WebSocketConnector} from "../common"

// To see how many users are currently online and send them maintenance messages

export class AdminConsole {
    constructor() {
    }

    init() {
        whenReady().then(() => {
            this.bind()
        })

    }

    bind() {
        this.ws = new WebSocketConnector({
            url: '/ws/base/',
            appLoaded: () => true,
            initialMessage: () => ({type: 'subscribe_admin'}),
            receiveData: data => {
                switch (data.type) {
                case 'connection_info':
                    this.renderConnectionInfo(data.sessions)
                    break
                case 'message_delivered': {
                    addAlert('info', gettext('Message delivered successfully!'))
                    const button = document.querySelector('input#submit_user_message')
                    button.value = gettext('Message delivered')
                    break
                }
                default:
                    break
                }
            }

        })
        this.ws.init()
        document.body.addEventListener('click', event => {
            const el = {}
            switch (true) {
            case findTarget(event, 'input#submit_user_message:not(.disabled)', el): {
                const message = document.querySelector('textarea#user_message').value
                if (!message.length) {
                    return
                }
                document.querySelector('textarea#user_message').disabled = true
                document.querySelector('input#submit_user_message').disabled = true
                document.querySelector('input#submit_user_message').value = gettext('Sending...')
                this.sendUserMessage(message)
                break
            }
            default:
                break
            }
        })
    }

    sendUserMessage(message) {
        this.ws.send(() => ({type: 'message', message}))
    }

    renderConnectionInfo(sessions) {
        const counterEl = document.getElementById('session_count')
        if (counterEl) {
            counterEl.innerHTML = sessions
        }
    }

}
