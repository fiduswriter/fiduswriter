export class Comment {
    constructor(id, user, userName, userAvatar, date, comment, answers, isMajor) {
        this.id = id
        this.user = user
        this.userName = userName
        this.userAvatar = userAvatar
        this.date = date
        this.comment = comment
        this.answers = answers
        this['review:isMajor'] = isMajor
        this.hidden = false
    }
}
