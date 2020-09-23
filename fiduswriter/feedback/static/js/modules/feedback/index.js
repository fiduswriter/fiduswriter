import {post, ensureCSS} from "../common"

// Creates the feedback tab. The tab is meant for user feedback to the developers while FW is still in
// a somewhat early stage. It is included in a way so it's easy to remove from all the templates.
// This is also where browser sniffing happens to prevent still unsupported browsers from logging in.

export class FeedbackTab {

    constructor() {
    }

    init() {
        this.render()
        this.bind()
    }

    render() {
        document.body.insertAdjacentHTML(
            'beforeend',
            `<div class="feedback-panel">
              <div id="feedback-wrapper">
                <div id="feedback-title">${gettext("Tech support")}</div>
                <p>${gettext("Did you encounter an error or bug?")}<br>
                    ${gettext("Give a brief description of what has happened.")}</p>
                <div id="feedback-form">
                  <form>
                    <textarea id="message" name="message" rows="10" cols="30"></textarea>
                    <input type="button" value='${gettext("submit")}' id="feedbackbutton" class="fw-button fw-orange" />
                  </form>
                </div>
                <div id="response-message">
                  ${gettext("Thank you for your report!")}
                </div>
                <span id="closeFeedback" class="fa fa-times-circle"></span>
              </div>
            </div>`
        )

        let headerNavWrapper = document.querySelector('#footer-menu.prelogin .fw-container')

        if (null === headerNavWrapper) {
            headerNavWrapper = document.querySelector('.fw-header .fw-container')
        }

        if (null === headerNavWrapper) {
            headerNavWrapper = document.querySelector('#headerbar')
        }

        if (null === headerNavWrapper) {
            headerNavWrapper = document.body
        }

        headerNavWrapper.insertAdjacentHTML(
            'beforeend',
            `<a class="feedback-tab" aria-label="${gettext('Technical support')}" href="#"></a>`
        )

        ensureCSS('feedback/feedback.css')
    }

    bind() {

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

        document.querySelector('#feedbackbutton').addEventListener('click', () => this.openFeedback())
    }

    openFeedback() {
        const messageEl = document.querySelector("textarea#message"),
            closeFeedbackEl = document.querySelector('#closeFeedback'),
            feedbackFormEl = document.querySelector('#feedback-form'),
            responseEl = document.querySelector('#response-message')
        if (!messageEl.value.length) {
            return
        }

        closeFeedbackEl.style.display = 'none'
        feedbackFormEl.style.visibility = 'hidden'

        post('/api/feedback/feedback/', {message: messageEl.value}).then(
            () => {
                messageEl.value = ''
                closeFeedbackEl.style.display = 'block'
                responseEl.style.display = 'block'
            }
        ).catch(
            (_error) => {
                messageEl.value = ''
                closeFeedbackEl.style.display = 'block'
            }
        )
        return false
    }

}
