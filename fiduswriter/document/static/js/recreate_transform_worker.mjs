import {
    recreateTransform
} from "./modules/editor/collab/merge/recreate_transform"

onmessage = function(message){
    const transform = recreateTransform(JSON.parse(message.data.stateDoc),JSON.parse(message.data.newStateDoc))
    postMessage(transform)
}