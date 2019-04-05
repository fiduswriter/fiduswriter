import {whenReady} from "../common"
import * as plugins from "../../plugins/login"


export class LoginPage {
    constructor({staticUrl}) {
        this.staticUrl = staticUrl
    }

    init() {
        this.activateFidusPlugins()
        whenReady().then(
            () => this.bind()
        )
    }

    activateFidusPlugins() {
        // Add plugins.
        this.plugins = {}

        Object.keys(plugins).forEach(plugin => {
            if (typeof plugins[plugin] === 'function') {
                this.plugins[plugin] = new plugins[plugin]({page: this, staticUrl: this.staticUrl})
                this.plugins[plugin].init()
            }
        })
    }

    bind() {
        const socialButtons = document.querySelectorAll('.fw-button.fw-socialaccount')
        let btnWidth = 1

        socialButtons.forEach(
            button => {
                const theWidth = button.clientWidth
                if (btnWidth < theWidth) {
                    btnWidth = theWidth
                }
            }
        )
        btnWidth += 15
        socialButtons.forEach(
            button => button.style.width = `${btnWidth}px`
        )
    }
}
