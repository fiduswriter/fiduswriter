export class EntryCatForm{
    constructor(dom, initialValue = [], options = []) {
        this.dom = dom
        this.currentValue = initialValue
        this.options = options
    }

    init() {
        this.drawForm()
    }

    drawForm() {
        let that = this
        this.options.forEach(option => {
            this.dom.insertAdjacentHTML('beforeend',`<div class="fw-checkable fw-checkable-label${this.currentValue.includes(option.id) ? ' checked' : ''}" data-id="${option.id}">${option.category_title}</div>`)
            this.dom.lastChild.addEventListener('click', event => {
                event.target.classList.toggle('checked')
            })
        })
    }

    get value() {
        return [].slice.call(this.dom.querySelectorAll('.fw-checkable.checked')).map(el => {
            return parseInt(el.getAttribute('data-id'))
        })
    }

}
