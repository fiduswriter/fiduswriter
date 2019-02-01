export class NavigatorView {
    constructor(editorView, options, navigatorItems) {
        this.editorView = editorView
        this.options = options
        this.navigatorItems = navigatorItems
        this.navigatorEl = document.querySelector('#navigator')
        this.listeners = {}
        this.bindEvents()
        this.render()
    }

    render(){
        this.navigatorEl.innerHTML = this.getNavigatorHTML()
        if(this.navigatorItems.length){
            this.navigatorEl.classList.remove('hide-navigator')
        }else{
            this.navigatorEl.classList.add('hide-navigator')
        }
    }

    bindEvents(){
        this.listeners.onclick = event => this.onclick(event)
        this.navigatorEl.addEventListener('click', this.listeners.onclick)
    }

    onclick(event){
        const target = event.target
        event.preventDefault()
        event.stopImmediatePropagation()
        if(target.matches('#navigator-button')){
            if( target.firstElementChild.firstElementChild.classList.contains('rotate')){
                target.firstElementChild.firstElementChild.classList.remove('rotate')
                document.getElementById('navigator').style.left = "-265px"
            }else{
                target.firstElementChild.firstElementChild.classList.add('rotate')
                document.getElementById('navigator').style.left = "0px"
            }
        }else if(target.matches('.fa-angle-right')){
            if( target.classList.contains('rotate')){
                target.classList.remove('rotate')
                document.getElementById('navigator').style.left = "-265px"
            }else{
                target.classList.add('rotate')
                document.getElementById('navigator').style.left = "0px"
            }
        }else if(target.matches('a')){
                let id = target.getAttribute('href').slice(1)
                document.getElementById(id).scrollIntoView({behavior:"smooth"})
        }
    }

    getNavigatorHTML(){
        return `
                <div id= "navigator-content" >
                    <h1 class= "header" >DOCUMENT NAVIGATOR</h1>
                    <div id = "navigator-list" >
                        ${this.navigatorItems}
                    </div>
                </div>
                <div id= "navigator-button" >
                    <span class="arrow-icon"><i class="fas fa-angle-right"></i></span>
                </div>
                `
    }

}


