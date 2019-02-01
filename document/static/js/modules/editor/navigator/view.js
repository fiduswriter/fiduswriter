import diffDOM from "diff-dom"

export class NavigatorView {
    constructor(editorView, options, tocHTML) {
        this.editorView = editorView
        this.options = options
        this.tocHTML = tocHTML
        this.navigatorEl = document.querySelector('#navigator')
        this.listeners = {}
        this.bindEvents()
        this.render()
    }

    render(){
        const newHeader = document.createElement('div')
        newHeader.innerHTML = this.getHeaderHTML()
        this.navigatorEl.append(newHeader)
    }

    bindEvents(){
        this.listeners.onclick = event => this.onclick(event)
        document.body.addEventListener('click', this.listeners.onclick)
    }

    onclick(event){
        const target = event.target
        event.preventDefault()
        event.stopImmediatePropagation()
        if(target.matches('.navigator-button')){
            if( target.firstElementChild.firstElementChild.classList.contains('toggle-down')){
                target.firstElementChild.firstElementChild.classList.remove('toggle-down')
                document.getElementById('navigator').style.left = "-265px"
            }else{
                target.firstElementChild.firstElementChild.classList.add('toggle-down')
                document.getElementById('navigator').style.left = "0px"
            }
        }else if(target.matches('.fa-angle-right')){
            if( target.classList.contains('toggle-down')){
                target.classList.remove('toggle-down')
                document.getElementById('navigator').style.left = "-265px"
            }else{
                target.classList.add('toggle-down')
                document.getElementById('navigator').style.left = "0px"
            }
        }else if(target.matches('a')){
                let id = target.getAttribute('href').slice(1)
                document.getElementById(id).scrollIntoView({behavior:"smooth"})
        }
    }

    getHeaderHTML(){
        return `
                <div class="navigator-content">
                    <h1 class="header">TABLE OF CONTENT</h1>
                    <div id = "navigator-list">
                        ${this.tocHTML}
                    </div>
                </div>
                <div class="navigator-button">
                    <span class="arrow-icon"><i class="fas fa-angle-right"></i></span>
                </div>
                `
    }

}


