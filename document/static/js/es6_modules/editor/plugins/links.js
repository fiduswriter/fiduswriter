import {Plugin, PluginKey} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"
import {noSpaceTmp} from "../../common"

const linksKey = new PluginKey('links')
export let linksPlugin = function(options) {

    return new Plugin({
        key: linksKey,
        props: {
            decorations: (state) => {
                const $head = state.selection.$head
                let linkMark = $head.marks().find(
                    mark => mark.type.name === 'link'
                )
                if (!linkMark) {
                    return
                }
                let startIndex = $head.index()

                while (
                    startIndex > 0 &&
                    linkMark.isInSet($head.parent.child(startIndex - 1).marks)
                ) {
                    startIndex--
                }

                let startPos = $head.start() // position of block start.

                for (let i = 0; i < startIndex; i++) {
                    startPos += $head.parent.child(i).nodeSize
                }

                let linkDropUp = document.createElement('span')

                linkDropUp.classList.add('link-drop-up-outer')

                linkDropUp.innerHTML = noSpaceTmp`
                    <div class="link-drop-up-inner">
                        ${gettext('Link')}:&nbsp;<a class="href" target="_blank" href="${linkMark.attrs.href}">
                            ${linkMark.attrs.href}
                        </a><br>
                        ${gettext('Title')}:&nbsp;${linkMark.attrs.title}
                        <div class="edit">
                            [<a href="#" class="edit-link">${gettext('Edit')}</a> | <a href="#" class="remove-link">${gettext('Remove')}</a>]
                        </div>
                    </div>
                `

                linkDropUp.querySelector('.edit-link').addEventListener('click', () => {
                    let toolbarLink = options.editor.menu.toolbarModel.content.find(item => item.id==='link')
                    if (toolbarLink) {
                        if (!toolbarLink.disabled(options.editor)) {
                            toolbarLink.action(options.editor)
                        }
                    }
                })
                linkDropUp.querySelector('.remove-link').addEventListener('click', () => {
                    let toolbarLink = options.editor.menu.toolbarModel.content.find(item => item.id==='link')
                    if (toolbarLink) {
                        if (!toolbarLink.disabled(options.editor)) {
                            options.editor.view.dispatch(
                                options.editor.view.state.tr.removeMark($head.start(), $head.end(), linkMark)
                            )
                        }
                    }
                })

                let deco = Decoration.widget(startPos, linkDropUp)

                return DecorationSet.create(state.doc, [deco])

            }
        }
    })
}
