// In order to stick with the format used in Fidus Writer 1.1-2.0,
// we do a few smaller modifications to the node before it is saved.

export class ModNodeConvert {
    constructor(editor) {
        editor.mod.nodeConvert = this
        this.editor = editor
    }

    modelToEditorNode(node) {
        let fnNodes = node.querySelectorAll('span.footnote')

          for (let i = 0; i < fnNodes.length; i++) {
              let newNode = document.createElement('span')
              newNode.setAttribute('contents',fnNodes[i].innerHTML)
              newNode.classList.add('footnote-marker')
              fnNodes[i].parentNode.replaceChild(newNode, fnNodes[i])
          }
          return node
    }

    editorToModelNode(node) {
        let fnNodes = node.querySelectorAll('.footnote-marker')

        for (let i = 0; i < fnNodes.length; i++) {
            let newNode = document.createElement('span')
            newNode.innerHTML = fnNodes[i].getAttribute('contents')
            newNode.classList.add('footnote')
            fnNodes[i].parentNode.replaceChild(newNode, fnNodes[i])
        }

        let strongNodes = node.querySelectorAll('strong')

        for (let i = 0; i < strongNodes.length; i++) {
            let newNode = document.createElement('b')
            while (strongNodes[i].firstChild) {
                newNode.appendChild(strongNodes[i].firstChild)
            }
            strongNodes[i].parentNode.replaceChild(newNode, strongNodes[i])
        }

        let emNodes = node.querySelectorAll('em')

        for (let i = 0; i < emNodes.length; i++) {
            let newNode = document.createElement('i')
            while (emNodes[i].firstChild) {
                newNode.appendChild(emNodes[i].firstChild)
            }
            emNodes[i].parentNode.replaceChild(newNode, emNodes[i])
        }

        // Remove katex contents of <span class="equation" >
        let mathNodes = node.querySelectorAll('span.equation')

        for (let i = 0; i < mathNodes.length; i++) {
            while (mathNodes[i].firstChild) {
                mathNodes[i].removeChild(mathNodes[i].firstChild)
            }
        }

        // Remove all rendered contents (euqations and images) of figures.
        let figureNodes = node.querySelectorAll('figure')

        for (let i = 0; i < figureNodes.length; i++) {
            while (figureNodes[i].firstChild) {
                figureNodes[i].removeChild(figureNodes[i].firstChild)
            }
        }

        // Remove all contenteditable attributes
        let ceNodes = node.querySelectorAll('[contenteditable]')

        for (let i = 0; i < ceNodes.length; i++) {
            ceNodes[i].removeAttribute('contenteditable')
        }

        return node
    }

}
