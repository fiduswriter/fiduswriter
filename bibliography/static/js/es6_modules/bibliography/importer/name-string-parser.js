import {BibLatexSingleNameParser} from "./single-name-parser"

export class BibLatexNameStringParser {
    constructor(nameString) {
        nameString = nameString.trim()
        this.people = []
        if (nameString) {
            this.parsePeople(nameString)
        }

    }

    parsePeople(nameString) {
        let people = []
        let tokenRe = /([^\s{}]+|\s|{|})/g
        let j = 0
        let k = 0
        let item
        while ((item = tokenRe.exec(nameString)) !== null) {
            let token = item[0]
            if (k === people.length) {
                people.push('')
            }
            if ('{' === token) {
                j += 1
            }
            if ('}' === token){
                j -= 1
            }
            if ('and' === token && 0 === j) {
                k += 1
            } else {
                people[k] += token
            }
        }
        people.forEach((person)=>{
            let nameParser = new BibLatexSingleNameParser(person)
            this.people.push(nameParser.output)
        })
    }

    get output() {
        let ref = []
        this.people.forEach((person) => {
            let name = ''
            if (person['first']) {
                name = '{' + person['first'] + '}'
            }
            if (person['last']) {
                if ('' === name) {
                    name = '{' + person['last'] + '}'
                } else {
                    name += ' {' + person['last'] + '}'
                }
            }
            ref.push(name)
        })
        return ref
    }

}
