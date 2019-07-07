export class URIFieldForm {
    constructor(dom, initialValue = '', placeHolder = '') {
        this.dom = dom
        this.initialValue = initialValue
        this.placeHolder = placeHolder
    }

    init() {
        this.dom.innerHTML = `<input class="uri" type="text" value="${this.initialValue}" placeholder="${this.placeHolder}">`
    }

    get value() {
        const formValue = this.dom.querySelector('input.uri').value
        // If the form has not been filled out, don't consider this form
        return formValue.length > 0 ? formValue : false
    }

    check() {
        const formValue = this.value
        if (formValue) {
            /* Copyright (c) 2010-2013 Diego Perini, MIT licensed
               https://gist.github.com/dperini/729294
             */
            const regTest = new RegExp(
                "^(?:(?:(?:https?|ftp):)?\\/\\/)(?:\\S+(?::\\S*)?@)?(?:(?!(?:10|127)(?:\\.\\d{1,3}){3})(?!(?:169\\.254|192\\.168)(?:\\.\\d{1,3}){2})(?!172\\.(?:1[6-9]|2\\d|3[0-1])(?:\\.\\d{1,3}){2})(?:[1-9]\\d?|1\\d\\d|2[01]\\d|22[0-3])(?:\\.(?:1?\\d{1,2}|2[0-4]\\d|25[0-5])){2}(?:\\.(?:[1-9]\\d?|1\\d\\d|2[0-4]\\d|25[0-4]))|(?:(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)(?:\\.(?:[a-z\\u00a1-\\uffff0-9]-*)*[a-z\\u00a1-\\uffff0-9]+)*(?:\\.(?:[a-z\\u00a1-\\uffff]{2,})).?)(?::\\d{2,5})?(?:[/?#]\\S*)?$",
                "i"
            )

            if (!regTest.test(formValue)) {
                this.dom.classList.add('fw-fomt-error')
                return false
            }
        }
        return true
    }

}
