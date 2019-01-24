import {EditorState} from "prosemirror-state"
import {EditorView} from "prosemirror-view"
import {history, redo, undo} from "prosemirror-history"
import {baseKeymap} from "prosemirror-commands"
import {keymap} from "prosemirror-keymap"
import {suggestionsPlugin, triggerCharacter} from "prosemirror-suggestions"
import {commentSchema} from "./schema"
import {notifyMentionedUser} from "./notify"
import {escapeText, findTarget} from "../../../common"

export class CommentEditor {
    constructor(mod, id, dom, text, options = {}) {
        this.mod = mod
        this.id = id
        this.dom = dom
        this.text = text
        this.options = options

        this.selectedTag = 0
        this.userTaggerList = []
        this.plugins = [
            history(),
            suggestionsPlugin({
                escapeOnSelectionChange: true ,
                matcher: triggerCharacter('@'),
                onEnter: (args) => {
                    this.selectedTag = 0
                    this.tagRange = args.range
                    const search = args.text.slice(1)
                    if (search.length) {
                        this.setUserTaggerList(search)
                        this.showUserTagger()
                    }
                },
                onChange: (args) => {
                    this.selectedTag = 0
                    this.tagRange = args.range
                    const search = args.text.slice(1)
                    if (search.length) {
                        this.setUserTaggerList(search)
                        this.showUserTagger()
                    }
                },
                onExit: (args) => {
                    this.selectedTag = 0
                    this.removeTagger()
                },
                onKeyDown: ({view, event}) => {
                    if (event.key === 'ArrowDown') {
                        if (this.userTaggerList.length > this.selectedTag + 1) {
                            this.selectedTag += 1
                            this.showUserTagger()
                        }
                        return true
                    } else if (event.key === 'ArrowUp') {
                        if (this.selectedTag > 0) {
                            this.selectedTag -= 1
                            this.showUserTagger()
                        }
                        return true
                    } else if (event.key === 'Enter') {
                        return this.selectUserTag()
                    }
                    return false
                },
                escapeKeys: ['Escape', 'ArrowRight', 'ArrowLeft']
            }),
            keymap(baseKeymap),
            keymap({
                "Mod-z": undo,
                "Mod-shift-z": undo,
                "Mod-y": redo,
                "Ctrl-Enter": () => this.submit()
            })
        ]
    }

    init() {
        this.initViewDOM()
        this.initView()
    }

    initViewDOM() {
        this.viewDOM = document.createElement('div')
        this.viewDOM.classList.add('ProseMirror-wrapper')
        this.dom.appendChild(this.viewDOM)
        this.dom.insertAdjacentHTML(
            'beforeend',
            `<input class="comment-is-major" type="checkbox" name="isMajor"
                ${this.options.isMajor ? 'checked' : ''}/>
            <label>${gettext("High priority")}</label>
            <div class="comment-btns">
                <button class="submit fw-button fw-dark" type="submit">
                    ${this.id !== '-1' ? gettext("Edit") :gettext("Submit")}
                </button>
                <button class="cancel fw-button fw-orange" type="submit">
                    ${gettext("Cancel")}
                </button>
            </div>
            <div class="tagger"></div>`
        )
    }

    initView() {
        this.view = new EditorView(this.viewDOM, {
            state: EditorState.create({
                schema: commentSchema,
                doc: commentSchema.nodeFromJSON({
                    type: 'doc',
                    content: this.text
                }),
                plugins: this.plugins
            }),
            dispatchTransaction: tr => {
                const newState = this.view.state.apply(tr)
                this.view.updateState(newState)
            }
        })
        this.oldUserTags = this.getUserTags()
        this.bind()
    }

    bind() {
        this.dom.addEventListener('click', event => {
            const el = {}
            switch (true) {
                case findTarget(event, 'button.submit', el):
                    this.submit()
                    break
                case findTarget(event, 'button.cancel', el):
                    this.mod.interactions.cancelSubmit()
                    break
                case findTarget(event, '.ProseMirror-wrapper', el):
                    this.view.focus()
                    break
                case findTarget(event, '.tag-user', el):
                    this.selectedTag = parseInt(el.target.dataset.index)
                    this.selectUserTag()
                    this.view.focus()
                    break
            }
        })


    }

    submit() {
        const comment = this.view.state.doc.toJSON().content,
            isMajor = this.dom.querySelector('.comment-is-major').checked
        if (comment && comment.length > 0) {
            this.mod.interactions.updateComment({id: this.id, comment, isMajor})
            this.sendNotifications()
        } else {
            this.mod.interactions.deleteComment(this.id)
        }
    }

    sendNotifications() {
        const newUserTags = this.getUserTags().filter(id => !this.oldUserTags.includes(id))
        if (newUserTags.length) {
            const comment = this.view.state.doc,
                docId = this.mod.editor.docInfo.id
            newUserTags.forEach(userId => notifyMentionedUser(docId, userId, comment))
        }
    }

    setUserTaggerList(search) {
        const owner = this.mod.editor.docInfo.owner
        this.userTaggerList = owner.team_members.concat(owner).filter(
            user => user.name.includes(search) || user.username.includes(search)
        )
    }

    showUserTagger() {
        if (!this.userTaggerList.length) {
            return
        }
        this.dom.querySelector('div.tagger').innerHTML = this.userTaggerList.map((user, index) =>
            `<div class="tag-user tag${index === this.selectedTag ? ' selected' : ''}" data-index="${index}">
                <img class="comment-user-avatar" src="${user.avatar ? user.avatar : `${this.mod.editor.staticUrl}img/default_avatar.png?v=${$StaticUrls.transpile.version$}`}">
                <h5 class="comment-user-name">${escapeText(user.name)}</h5>
            </div>`
        ).join('')
    }

    selectUserTag() {
        const user = this.userTaggerList[this.selectedTag]
        if (!user || !this.tagRange) {
            return false
        }
        const tr = this.view.state.tr.replaceRangeWith(
            this.tagRange.from,
            this.tagRange.to,
            this.view.state.schema.nodes.collaborator.create({id: user.id, name: user.name})
        )
        this.view.dispatch(tr)
        return true
    }

    getUserTags() {
        const users = []
        this.view.state.doc.descendants(node => {
            if (node.type.name==='collaborator') {
                users.push(node.attrs.id)
            }
        })
        return [...new Set(users)] // only unique values.
    }

    removeTagger() {
        this.dom.querySelector('div.tagger').innerHTML = ''
        this.tagRange = false
        this.userTaggerList = []
    }
}
