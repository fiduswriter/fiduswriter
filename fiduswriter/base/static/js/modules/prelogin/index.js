import {setLanguage, ensureCSS, setDocTitle, whenReady} from "../common"
import * as plugins from "../../plugins/prelogin"
import {FeedbackTab} from "../feedback"

import {basePreloginTemplate} from "./templates"

export class PreloginPage {
    constructor({app, isFree, language, registrationOpen, staticUrl}) {
        this.app = app
        this.isFree = isFree
        this.language = language
        this.registrationOpen = registrationOpen
        this.staticUrl = staticUrl
        this.pluginLoaders = {}
        this.title = ''
        this.contents = ''
        this.footerLinks = [
            {
                text: gettext("Terms and Conditions"),
                link: '/pages/terms/'
            },
            {
                text: gettext("Privacy policy"),
                link: '/pages/privacy/'
            },
            {
                text: gettext("Equations and Math with MathLive"),
                link: 'https://mathlive.io/',
                external: true
            },
            {
                text: gettext("Citations with Citation Style Language"),
                link: 'https://citationstyles.org/',
                external: true
            },
            {
                text: gettext("Editing with ProseMirror"),
                link: 'https://prosemirror.net/',
                external: true
            }
        ]
        this.headerLinks = [
            {
                type: 'button',
                text: gettext('Log in'),
                link: '/'
            }
        ]
    }

    activateFidusPlugins() {
        // Add plugins.
        this.plugins = {}

        // Plugins for the specific page
        Object.keys(this.pluginLoaders).forEach(plugin => {
            if (typeof this.pluginLoaders[plugin] === 'function') {
                this.plugins[plugin] = new this.pluginLoaders[plugin]({page: this, staticUrl: this.staticUrl})
                this.plugins[plugin].init()
            }
        })

        // General plugins for all prelogin pages
        Object.keys(plugins).forEach(plugin => {
            if (typeof plugins[plugin] === 'function') {
                this.plugins[plugin] = new plugins[plugin]({page: this, staticUrl: this.staticUrl})
                this.plugins[plugin].init()
            }
        })
    }

    init() {
        return whenReady().then(() => {
            this.activateFidusPlugins()
            this.render()
            this.bind()
        })
    }

    bind() {
        this.dom.querySelector('.fw-login-logo').addEventListener('click', () => this.app.goTo('/'))
        this.dom.querySelector('#lang-selection').addEventListener('change', event => {
            this.language = event.target.value
            return setLanguage(this.app.config, this.language)
        })
    }

    render() {
        this.dom = document.createElement('body')
        this.dom.classList.add('prelogin')
        this.dom.innerHTML = basePreloginTemplate({
            isFree: this.isFree,
            language: this.language,
            headerLinks: this.headerLinks,
            footerLinks: this.footerLinks,
            contents: this.contents,
            staticUrl: this.staticUrl
        })
        document.body = this.dom
        ensureCSS([
            'prelogin.css'
        ], this.staticUrl)
        setDocTitle(this.title, this.app)
        const feedbackTab = new FeedbackTab({staticUrl: this.staticUrl})
        feedbackTab.init()
    }

}
