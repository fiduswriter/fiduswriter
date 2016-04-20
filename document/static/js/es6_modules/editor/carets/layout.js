//import {Pos} from "prosemirror/dist/model"
import {Caret} from "./caret"
import {scheduleDOMUpdate} from "prosemirror/dist/ui/update"
import {fromHTML, toHTML} from "prosemirror/dist/format"

export class ModCaretLayout {
    constructor(mod) {
        mod.layout = this
        this.mod = mod
        this.markedSelectionUser = {}
        this.exMarkedSelectionUser = {}
        this.color = {}
    }

    updateCaret(positionJSON){
        let that = this
        let positionUser = JSON.parse(positionJSON)
        let userId = positionUser.id
        let selection = positionUser.posFrom
        let startPos = selection - 1
        let endPos = selection
        //let markedSelection = that.mod.editor.pm.markRange(startPos, endPos)
//let markedSelection = that.mod.editor.pm.markRange(41, 43)
        //let markedSelection = this.mod.editor.pm.markRange(new Pos(position.anchor.path, position.anchor.offset-1), new Pos(position.anchor.path, position.anchor.offset), { className: 'cursorUserOne' + userId, removeWhenEmpty: false })
        let markedSelection = this.mod.editor.pm.markRange(startPos, endPos,{ removeWhenEmpty: false, className: 'cursorUserOne' + userId })
         this.exMarkedSelectionUser[userId] = markedSelection
        if (!this.markedSelectionUser[userId]) {
            this.markedSelectionUser[userId] = markedSelection
            this.exMarkedSelectionUser[userId] = this.markedSelectionUser[userId]
            return
            }
        this.exMarkedSelectionUser[userId] = this.markedSelectionUser[userId]
        this.markedSelectionUser[userId] = markedSelection
        if (this.exMarkedSelectionUser[userId].from!=this.exMarkedSelectionUser[userId].to)
            this.mod.editor.pm.removeRange(this.exMarkedSelectionUser[userId])
        scheduleDOMUpdate(this.mod.editor.pm,function(){that.mod.layout.setCaretColor(userId)})
    }

    setCaretColor(userId){
        if (!this.color[userId])
            this.color[userId] = this.getRandomColor()
            //jQuery('.cursorUserOne'+userId).css("background-color","red")
            jQuery('.cursorUserOne'+userId).css('border-right','solid 3px '+this.color[userId])
    }
    
    getRandomColor() {
    /*let letters = '0123456789ABCDEF'.split('')
    let color = '#'
    for (let i = 0; i < 6; i++ ) {
        color += letters[Math.floor(Math.random() * 16)]
    }*/
        let colorPool = ['#FF0000','#00FFFF','#0000FF','#0000A0','#ADD8E6','#800080','#FFFF00','#00FF00','#FF00FF','#808080','#FFA500','#A52A2A','#008000','#FFCBA4','#F75D59','#7D0552','#FCDFFF','#6AFB92','#46C7C7','#736AFF','#F52887']
        let color = colorPool[Math.floor(Math.random()*colorPool.length)];
        if (color in this.color)
            this.getRandomColor()
        else
            return color
    }
}
