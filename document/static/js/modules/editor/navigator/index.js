import {escapeText ,findTarget} from "../../common"
export class ModNavigator {
    constructor(editor) {
        editor.mod.navigator = this
        this.editor = editor
        this.navigatorEl = document.querySelector('#navigator')
        this.listeners = {}
        this.navigatorFilters = editor.menu.navigatorFilterModel.content
        this.defaultFilters = ['heading1','heading2','heading3']
        this.render()
        this.bindEvents()
    }
    render(){
        this.navigatorEl.innerHTML = this.getNavigatorTemplate()
    }
    bindEvents(){
        document.body.addEventListener('click', event => {
            const el = {}
            switch (true) {
                case findTarget(event, '#navigator-button', el):
                    document.querySelector('#navigator-list').innerHTML = this.populateNavigator() || ""   //Populating the list
                    if (el.target.firstElementChild.firstElementChild.classList.contains('rotate')){
                        this.closeNavigator()
                    } else {
                        this.openNavigator()
                    }
                    break
                case findTarget(event, '#navigator-list a', el):
                    event.preventDefault()
                    event.stopImmediatePropagation()
                    document.getElementById(el.target.getAttribute('href').slice(1)).scrollIntoView({behavior:"smooth"})
                    break
                case findTarget(event, '#navigator-filter-icon', el):
                    if (document.getElementById("navigator-filter").classList.contains('hide')){
                        this.showFilters()
                    } else {
                        this.hideFilters()
                    }
                    break
                case findTarget(event, '#navigator-filter-back', el):
                    this.defaultFilters = []
                    document.querySelectorAll('#navigator-filter input').forEach(
                        item => {
                            if (item.checked){
                                this.defaultFilters.push(item.id)
                            }
                        }
                    )
                    document.querySelector('#navigator-list').innerHTML = this.populateNavigator() || ""
                    this.hideFilters()
                    break
                case findTarget(event, 'input', el):
                    break
                case findTarget(event, 'label', el):
                    break
                default:
                    this.closeNavigator()
                    break
            }
        })

        document.querySelector('#navigator-list').addEventListener('mouseover',() => {
            document.body.classList.add('no-scroll')
        })
        document.querySelector('#navigator-list').addEventListener('mouseout',() => {
            document.body.classList.remove('no-scroll')
        })
    }
    openNavigator(){
        document.getElementById('navigator-button').firstElementChild.firstElementChild.classList.add('rotate')
        document.getElementById('navigator').style.left = "0px"

        document.getElementById("navigator-filter").classList.add('hide')
        document.getElementById("navigator-list").classList.remove('hide')
        document.getElementById('navigator-filter-back').classList.add('hide')
        document.getElementById('navigator-filter-icon').classList.remove('hide')
    }
    closeNavigator(){
        document.getElementById('navigator-button').firstElementChild.firstElementChild.classList.remove('rotate')
        document.getElementById('navigator').style.left = "-265px"
    }
    showFilters(){
        document.getElementById("navigator-filter").classList.remove('hide')
        document.getElementById('navigator-filter-back').classList.remove('hide')
        document.getElementById("navigator-list").classList.add('hide')
        document.getElementById('navigator-filter-icon').classList.add('hide')
        //populating the filter list
        document.getElementById('navigator-filter').innerHTML = this.populateNavFilter()
    }
    hideFilters(){
        document.getElementById("navigator-filter").classList.add('hide')
        document.getElementById('navigator-filter-back').classList.add('hide')
        document.getElementById("navigator-list").classList.remove('hide')
        document.getElementById('navigator-filter-icon').classList.remove('hide')
    }
    populateNavigator(){
        const items = []
        this.editor.view.state.doc.descendants((node) => {
            if (node.attrs && node.attrs.hidden) {
                return false
            } else if (this.defaultFilters.includes(node.type.name)) {
                items.push({id: node.attrs.id, textContent: node.textContent, type: node.type})
            }
        })
        if (items.length){
            return this.navigatorHTML(items)
        } else {
            return false
        }
    }
    populateNavFilter(){
        return (
            this.navigatorFilters.map(
                item => {
                    const level = item.level
                    return `<span><input type="checkbox" class="form-checkbox" id="heading${level}" ${this.inDefault(level)} />
                                <label for="heading${level}">${item.title}</label>
                            </span><br/><br/>`
                }
            ).join('')
        )
    }
    inDefault(level){
        if (this.defaultFilters.includes('heading'+level)){
            return 'checked'
        } else {
            return ''
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
                    <div class="header-container">
                        <span id="navigator-filter-back" class="hide"><i class="fas fa-arrow-left"></i></span>
                        <h1 class="header">${gettext('Document Navigator')}</h1>
                        <span id="navigator-filter-icon"><i class="fas fa-filter"></i></span>
                    </div>
                    <div id="navigator-list"></div>
                    <div id="navigator-filter" class="hide">
                    </div>
                </div>
                <div id="navigator-button">
                    <span class="navigator-arrow-icon"><i class="fas fa-angle-right"></i></span>
                </div>
                `
    }

}
