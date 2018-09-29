import {Editor} from "./modules/editor"

/* Create theEditor and make it available to the general namespace.
*/

const pathnameParts = window.location.pathname.split('/')
let id = parseInt(pathnameParts[pathnameParts.length - 2], 10)

if (isNaN(id)) {
    id = 0
}
const theEditor = new Editor(id, window.fidusConfig)
theEditor.init()

window.theEditor = theEditor
