import {escapeText} from "../../common"
export class ModNavigator {
    constructor(editor) {
        editor.mod.navigator = this
        this.editor = editor
        this.navigatorEl = document.querySelector('#navigator')
        this.listeners = {}
        this.render()
        this.bindEvents()
    }
    render(){
        this.navigatorEl.innerHTML = this.getNavigatorTemplate()
    }
    bindEvents(){
        this.listeners.onclick = event => this.onclick(event)
        document.addEventListener('click', this.listeners.onclick)
    }
    onclick(event){
        const target = event.target
        event.preventDefault()
        event.stopImmediatePropagation()
        if (target.matches('#navigator-button')){
            document.querySelector('#navigator-list').innerHTML = this.populateNavigator() || ""   //Populating the list
            if (target.firstElementChild.firstElementChild.classList.contains('rotate')){
                this.closeNavigator()
            } else {
                this.openNavigator()
            }
        } else if (target.matches('.fa-angle-right')){
            document.querySelector('#navigator-list').innerHTML = this.populateNavigator() || ""    //Populating the list
            if (target.classList.contains('rotate')){
                this.closeNavigator()
            } else {
                this.openNavigator()
            }
        } else if (target.matches('a')){
                let id = target.getAttribute('href').slice(1)
                document.getElementById(id).scrollIntoView({behavior:"smooth"})
        } else {
            this.closeNavigator()
        }
    }

    openNavigator(){
        document.getElementById('navigator-button').firstElementChild.firstElementChild.classList.add('rotate')
        document.getElementById('navigator').style.left = "0px"
    }
    closeNavigator(){
        document.getElementById('navigator-button').firstElementChild.firstElementChild.classList.remove('rotate')
        document.getElementById('navigator').style.left = "-265px"
    }
    populateNavigator(){
        let items = []
        this.editor.view.state.doc.descendants((node) => {
            if (node.attrs && node.attrs.hidden) {
                return false
            } else if (node.type.groups.includes('heading')) {
                items.push({id: node.attrs.id, textContent: node.textContent, type: node.type})
            }
        })
        if (items.length){
            return this.navigatorHTML(items)
        } else {
            return false
        }
    }
    navigatorHTML(items) {
        return `
        ${
            items.map(
                item => {
                    const level = item.type.name.substr(-1)
                    return `<h${level}><a href="#${item.id}">${escapeText(item.textContent)}</a></h${level}>`
                }
            ).join('')
        }`
    }
    getNavigatorTemplate(){
        return `
                <div id="navigator-content">
                    <h1 class="header">${gettext('Document Navigator')}</h1>
                    <div id="navigator-list"></div>
                </div>
                <div id="navigator-button">
                    <span class="navigator-arrow-icon"><i class="fas fa-angle-right"></i></span>
                </div>
                `
    }

}


