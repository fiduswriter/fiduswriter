const CSS_COLORS = [
    '0,119,190',
    '217,58,50',
    '0,0,160',
    '119,190,0',
    '97,255,105',
    '173,216,230',
    '128,0,128',
    '128,128,128',
    '255,165,0'
]

/* Create a CSS stylesheet for the colors of all users. */
export class ModCollabColors {
    constructor(mod) {
        mod.colors = this
        this.mod = mod
        this.cssColorDefinitions = []
        this.userColorStyle = false
        this.setup()
    }

    setup() {
        let styleContainers = document.createElement('temp')
        styleContainers.innerHTML = `<style type="text/css" id="user-colors"></style>`
        while (styleContainers.firstElementChild) {
            document.head.appendChild(styleContainers.firstElementChild)
        }
        this.userColorStyle = document.getElementById('user-colors')
    }

    // Ensure that there are at least the given number of user color styles.
    provideUserColorStyles(number) {
        if (this.cssColorDefinitions.length < number) {
            let start = this.cssColorDefinitions.length
            for (let i=start;i<number;i++) {
                let color = i < CSS_COLORS.length ? CSS_COLORS[i] :
                    `${Math.round(Math.random()*255)},${Math.round(Math.random()*255)},${Math.round(Math.random()*255)}`
                let styleDefinition = `.user-${i} {border-color: rgba(${color},1)} .user-bg-${i} {background-color: rgba(${color},0.2)}`
                this.cssColorDefinitions.push(styleDefinition)
            }
            this.userColorStyle.innerHTML = this.cssColorDefinitions.join('\n')
        }
    }



}
