import {escapeText, findTarget} from "./basic"
import {ensureCSS} from "./network"

export class FileSelector {
    constructor({
        dom,
        files,
        showFiles = true,
        selectDir = _path => {},
        selectFile = _path => {},
        fileIcon = 'far fa-file-alt'
    }) {
        this.dom = dom
        this.files = files
        this.showFiles = showFiles // Whether to show existing files or only folders
        this.selectDir = selectDir
        this.selectFile = selectFile
        this.fileIcon = fileIcon // File icon to use
        this.root = {name: '/', type: 'folder', open: true, selected: true, path: '/', children: []}
        this.selected = this.root
    }

    init() {
        this.readDirStructure()
        ensureCSS('file_selector.css')
        this.dom.classList.add('fw-file-selector')
        this.render()
        this.bind()
    }

    readDirStructure() {
        // Read directory structure from existing file paths
        this.files.forEach(file => {
            let treeWalker = this.root.children
            const pathParts = file.path.split('/')
            pathParts.forEach((pathPart, pathIndex) => {
                if (!pathPart.length) {
                    return
                }
                if (pathIndex === (pathParts.length - 1)) {
                    if (this.showFiles) {
                        treeWalker.push({name: pathPart, type: 'file', path: pathParts.slice(0, pathIndex + 1).join('/')})
                    }
                    return
                }
                let folder = treeWalker.find(item => item.name === pathPart && item.type === 'folder')
                if (!folder) {
                    folder = {name: pathPart, type: 'folder', open: false, selected: false, path: pathParts.slice(0, pathIndex + 1).join('/') + '/', children: []}
                    treeWalker.push(folder)
                }
                treeWalker = folder.children
            })

        })
    }

    addFolder(rawName) {
        const name = rawName.replace(/\//g, '')
        // Add a new folder as a subfolder to the currently selected folder
        if (
            !this.selected ||
            this.selected.type !== 'folder' ||
            this.selected.children.find(child => child.type === 'folder' && child.name === name)
        ) {
            // A file is selected. Give up.
            return
        }
        const newFolder = {name, type: 'folder', open: true, selected: true, path: this.selected.path + name + '/', children: []}
        this.selected.children.push(newFolder)
        this.selected.open = true
        this.selected.selected = false
        this.selected = newFolder
        this.selectDir(newFolder.path)
        this.render()
    }

    render() {
        this.dom.innerHTML = this.renderFolder(this.root)
    }

    renderFolder(folder, indentLevel = 0) {
        let returnString = ''
        returnString += `<div class="folder${folder.open ? '' : ' closed'}">`
        returnString += `<p>${
            '&nbsp;&nbsp;&nbsp;'.repeat(indentLevel)
        }${
            folder.children.length ? `<i class="far fa-${folder.open ? 'minus' : 'plus'}-square"></i>&nbsp;` : ''
        }<span class="folder-name${folder.selected ? ' selected' : ''}"><i class="fas fa-folder"></i>${escapeText(folder.name)}</span></p>`
        if (folder.open) {
            returnString += '<div class="folder-content">'
            returnString += folder.children.map(child => {
                if (child.type === 'folder') {
                    return this.renderFolder(child, indentLevel + 1)
                } else {
                    return `<p>${'&nbsp;&nbsp;&nbsp;'.repeat(indentLevel)}<span class="file-name${child.selected ? ' selected' : ''}"><i class="${this.fileIcon}"></i>${escapeText(child.name)}</span></p>`
                }
            }).join('')
            returnString += '</div>'
        }
        returnString += '</div>'
        return returnString
    }

    findEntry(dom) {
        const searchPath = []
        let seekItem = dom
        while (seekItem.closest('div.folder')) {
            let itemNumber = 0
            seekItem = seekItem.closest('div.folder')
            while (seekItem.previousElementSibling) {
                itemNumber++
                seekItem = seekItem.previousElementSibling
            }
            searchPath.push(itemNumber)
            seekItem = seekItem.parentElement
        }
        let entry = this.root
        searchPath.pop()
        while (searchPath.length) {
            entry = entry.children[searchPath.pop()]
        }
        return entry
    }

    bind() {
        this.dom.addEventListener('click', event => {
            const el = {}
            switch (true) {
            case findTarget(event, '.fa-plus-square', el): {
                event.preventDefault()
                const entry = this.findEntry(el.target)
                entry.open = true
                this.render()
                break
            }
            case findTarget(event, '.fa-minus-square', el): {
                event.preventDefault()
                const entry = this.findEntry(el.target)
                entry.open = false
                this.render()
                break
            }
            case findTarget(event, '.folder-name', el): {
                event.preventDefault()
                const entry = this.findEntry(el.target)
                if (this.selected) {
                    this.selected.selected = false
                }
                entry.selected = true
                this.selected = entry
                this.render()
                this.selectDir(entry.path)
                break
            }
            case findTarget(event, '.file-name', el): {
                event.preventDefault()
                const entry = this.findEntry(el.target)
                if (this.selected) {
                    this.selected.selected = false
                }
                entry.selected = true
                this.selected = entry
                this.render()
                this.selectFile(entry.path)
                break
            }
            }
        })
    }
}
