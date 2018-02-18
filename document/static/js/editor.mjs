import {Editor} from "./modules/editor"

/* Create theEditor and make it available to the general namespace.
*/

let pathnameParts = window.location.pathname.split('/')
let id = parseInt(pathnameParts[pathnameParts.length - 2], 10)

if (isNaN(id)) {
    id = 0
}
let theEditor = new Editor(id)
theEditor.init()

window.theEditor = theEditor
