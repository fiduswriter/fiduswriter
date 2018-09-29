import {post, ensureCSS} from "../common"

// Creates the feedback tab. The tab is meant for user feedback to the developers while FW is still in
// a somewhat early stage. It is included in a way so it's easy to remove from all the templates.
// This is also where browser sniffing happens to prevent still unsupported browsers from logging in.

export class FeedbackTab {

    init({staticUrl}) {
        this.staticUrl = staticUrl
        this.render()
        this.bind()
    }

    render() {
        document.body.insertAdjacentHTML(
            'beforeend',
            `<a class="feedback-tab" href="#">${gettext("Tech support")}</a>
            <div class="feedback-panel">
              <div id="feedback-wrapper">
                <div id="feedback-title">${gettext("Tech support")}</div>
                <p>${gettext("Did you encounter an error or bug?")}<br>
                    ${gettext("Give a brief description of what has happened.")}</p>
                <div id="feedback-form">
                  <form method="post" action="/feedback/feedback/">
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
        ensureCSS('feedback/feedback.css', this.staticUrl)
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

}
