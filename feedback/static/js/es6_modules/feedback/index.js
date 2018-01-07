import {post} from "../common"
import * as bowser from "bowser/bowser"

const MINIMUM_BROWSER_VERSIONS = {
    msedge: '15',
    msie: '15', // effectively none
    firefox: '52',
    chrome: '59',
    safari: '11'
}

// Creates the feedback tab. The tab is meant for user feedback to the developers while FW is still in
// a somewhat early stage. It is included in a way so it's easy to remove from all the templates.
// This is also where browser sniffing happens to prevent still unsupported browsers from logging in.

export class FeedbackTab {
    constructor() {
        this.verifyBrowser()
        this.bind()
    }

    bind() {
        document.querySelector('a.feedback-tab').style.marginTop = document.querySelector('a.feedback-tab').clientWidth

        document.querySelector('a.feedback-tab').addEventListener('click', event => {
            document.querySelector('.feedback-panel').style.display = 'block'
            event.preventDefault()
        })

        document.querySelector('#closeFeedback').addEventListener('click', event => {
            document.querySelector('.feedback-panel').style.display = 'none'
            document.querySelector('#feedback-form').style.visibility = 'visible'
            document.querySelector('#response-message').style.display = 'none'
            event.preventDefault()
        })

        document.querySelector('#feedbackbutton').addEventListener('click', event => this.openFeedback())
    }

    openFeedback() {
        let messageEl = document.querySelector("textarea#message"),
            closeFeedbackEl = document.querySelector('#closeFeedback'),
            feedbackFormEl = document.querySelector('#feedback-form'),
            responseEl = document.querySelector('#response-message')

        closeFeedbackEl.style.display = 'none'
        feedbackFormEl.style.visibility = 'hidden'

        post('/feedback/feedback/', {message: messageEl.value}).then(
            () => {
                messageEl.value = ''
                closeFeedbackEl.style.display = 'block'
                responseEl.style.display = 'block'
            }
        )
        return false
    }

    // Verify that we are running on a current browser.
    verifyBrowser() {
        if (bowser.isUnsupportedBrowser(MINIMUM_BROWSER_VERSIONS, window.navigator.userAgent)) {
            let warning =
                `<div>
                    <p>
                        ${
                            gettext(
                                "Your browser is not supported by Fidus Writer. \
                                Please update! We recommend using a current \
                                version of Chrome/Chromium or Firefox on a \
                                desktop computer."
                            )
                        }
                    </p>
                </div>`
            jQuery(warning).dialog({
                modal: true,
                title: gettext("Warning"),
                minHeight: 200,
                minWidth: 300
            })
        }
    }

}
