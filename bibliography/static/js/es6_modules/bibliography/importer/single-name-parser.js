export class BibLatexSingleNameParser {

    constructor(nameString) {
        this.nameString = nameString
        this.nameDict = {}
        this._first = []
        this._last = []
    }

    get output() {
        let parts = this.splitTexString(this.nameString, ',')
        if (parts.length ===  3) { // von Last, Jr, First
            this.processVonLast(
                this.splitTexString(parts[0]),
                this.splitTexString(parts[1])
            )
            this.processFirstMiddle(this.splitTexString(parts[2]))
        } else if (parts.length === 2) {  // von Last, First
            this.processVonLast(this.splitTexString(parts[0]))
            this.processFirstMiddle(this.splitTexString(parts[1]))
        } else if (parts.length === 1) {  // First von Last
            let spacedParts = this.splitTexString(this.nameString)
            if (spacedParts.length === 1) {
                this.nameDict['first'] = spacedParts[0]
            } else {
                let split = this.splitAt(spacedParts)
                let firstMiddle = split[0]
                let vonLast = split[1]
                if (vonLast.length === 0 && firstMiddle.length > 1) {
                    let last = firstMiddle.pop()
                    vonLast.push(last)
                }
                this.processFirstMiddle(firstMiddle)
                this.processVonLast(vonLast)
            }

        } else {
            this.nameDict['first'] = this.nameString
        }
        return this.nameDict
    }

    splitTexString(string, sep=null) {
        if (sep===null) {
            sep = '[\\s~]+'
        }
        let braceLevel = 0
        let nameStart = 0
        let result = []
        let stringLen = string.length
        let pos = 0
        while (pos < stringLen) {
            let char = string.charAt(pos)
            if (char === '{') {
                braceLevel += 1
            } else if (char === '}') {
                braceLevel -= 1
            } else if (braceLevel === 0 && pos > 0) {
                let match = string.slice(pos).match(window.RegExp(`^${sep}`))
                if (match) {
                    let sepLen = match[0].length
                    if (pos + sepLen < stringLen) {
                        result.push(string.slice(nameStart, pos))
                        nameStart = pos + sepLen
                    }
                }
            }
            pos++
        }
        if (nameStart < stringLen) {
            result.push(string.slice(nameStart))
        }
        return result.map((string)=>{return string.replace(/^(\s|{|})+|(\s|{|})+$/g,'')})
    }

    processFirstMiddle(parts) {
        this._first = this._first.concat(parts)
        this.nameDict['first'] = this._first.join(' ')
    }

    processVonLast(parts, lineage=[]) {
        let rSplit = this.rsplitAt(parts)
        let von = rSplit[0]
        let last = rSplit[1]
        if (von && !last) {
            last.push(von.pop())
        }
        this._last = this._last.concat(von)
        this._last = this._last.concat(last)
        this._last = this._last.concat(lineage)
        this.nameDict['last'] = this._last.join(' ')
    }

    findFirstLowerCaseWord(lst) {
        // return index of first lowercase word in lst. Else return length of lst.
        for(let i = 0;i<lst.length;i++) {
            let word = lst[i]
            if (word === word.toLowerCase()) {
                return i
            }
        }
        return lst.length
    }

    splitAt(lst) {
        // Split the given list into two parts.
        // The second part starts with the first lowercase word.
        let pos = this.findFirstLowerCaseWord(lst)
        return [lst.slice(0, pos), lst.slice(pos)]
    }

    rsplitAt(lst) {
        let rpos = this.findFirstLowerCaseWord(lst.slice().reverse())
        let pos = lst.length - rpos
        return [lst.slice(0, pos), lst.slice(pos)]
    }

}
