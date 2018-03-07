export class Comment {
    constructor(id, user, username, date, comment, answers, isMajor) {
        this.id = id
        this.user = user
        this.username = username
        this.date = date
        this.comment = comment
        this.answers = answers
        this.isMajor = isMajor
        this.hidden = false
    }
}
