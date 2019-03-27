import {Plugin, PluginKey} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"
import {RemoveMarkStep} from "prosemirror-transform"

import {noSpaceTmp, addAlert} from "../../common"
import {randomHeadingId, randomFigureId} from "../../schema/common"
import {LinkDialog} from "../dialogs"

const key = new PluginKey('links')

const copyLink = function(href) {
    const textarea = document.createElement("textarea")
    textarea.textContent = href
    textarea.style.position = "fixed" // Prevent scrolling to bottom of page in MS Edge.
    document.body.appendChild(textarea)
    textarea.select()
    try {
        document.execCommand("copy") // Security exception may be thrown by some browsers.
        document.body.removeChild(textarea)
        addAlert('info', gettext('Link copied to clipboard'))
    } catch (ex) {
        addAlert('info', gettext(
            'Copy to clipboard failed. Please copy manually.'
        ))
    }
}

export const linksPlugin = function(options) {

    function getUrl(state, oldState, oldUrl) {
        const id = state.selection.$head.parent.attrs.id,
            mark = state.selection.$head.marks().find(mark =>
                mark.type.name === 'anchor')
        let newUrl = oldUrl.split('#')[0]
        if (mark) {
            newUrl += `#${mark.attrs.id}`
        } else if (id) {
            newUrl += `#${id}`
        }
        const changed = oldUrl === newUrl ? false : true
        // TODO: Should the following be moved to a view?
        // Not sure if this counts as a DOM update.
        if (changed && options.editor.currentView.state === oldState) {
            window.history.replaceState("", "", newUrl)
        }
        return newUrl
    }

    function getLinkMark(state) {
        return state.selection.$head.marks().find(mark =>
            mark.type.name === 'link')
    }

    function getAnchorMark(state) {
        return state.selection.$head.marks().find(mark =>
            mark.type.name === 'anchor')
    }

    function getDecos(state) {
        const $head = state.selection.$head
        const currentMarks = [],
            linkMark = $head.marks().find(
                mark => mark.type.name === 'link'
            ),
            anchorMark = $head.marks().find(
                mark => mark.type.name === 'anchor'
            )
        if (linkMark) {
            currentMarks.push(linkMark)
        }
        if (anchorMark) {
            currentMarks.push(anchorMark)
        }
        if (!currentMarks.length) {
            return DecorationSet.empty
        }
        let index = $head.index()
        while (
            index < ($head.parent.childCount-1) &&
            currentMarks.some(mark => mark.isInSet(
                $head.parent.child(index-1).marks
            ))
        ) {
            index++
        }
        let startPos = $head.start() // position of block start.
        for (let i = 0; i <= index; i++) {
            startPos += $head.parent.child(i).nodeSize
        }

        const dom = createDropUp(linkMark, anchorMark, $head),
            deco = Decoration.widget(startPos, dom)
        return DecorationSet.create(state.doc, [deco])
    }

    function createDropUp(linkMark, anchorMark, $head) {
        const dropUp = document.createElement('span'),
            editor = options.editor,
            writeAccess = editor.docInfo.access_rights === 'write' ? true : false
        let linkType, linkHref, anchorHref, requiredPx = 10

        if (linkMark) {
            linkType = linkMark.attrs.href[0] === '#' ? 'internal' : 'external'
            linkHref = linkType === 'internal' ?
                window.location.href.split('#')[0] + linkMark.attrs.href :
                linkMark.attrs.href
            requiredPx += 120
        }

        if (anchorMark) {
            anchorHref = window.location.href.split('#')[0] + '#' + anchorMark.attrs.id
            requiredPx += 92
        }


        dropUp.classList.add('drop-up-outer')

        dropUp.innerHTML = noSpaceTmp`
            <div class="link drop-up-inner" style="top: -${requiredPx}px;">
                ${
                    linkMark ?
                    `<div class="drop-up-head">
                        ${
                            linkMark.attrs.title ?
                            `<div class="link-title">${gettext('Title')}:&nbsp;${linkMark.attrs.title}</div>` :
                            ''
                        }
                        <div class="link-href">
                            <a class="href" ${linkType === 'external' ? 'target="_blank"' : ''} href="${linkHref}">
            		            ${linkHref}
            		        </a>
                        </div>
                    </div>
                    <ul class="drop-up-options">
                        <li class="copy-link" title="${gettext('Copy link')}">
                            ${gettext('Copy link')}
                        </li>
                        ${
                            writeAccess ?
                            `<li class="edit-link" title="${gettext('Edit link')}">
                                ${gettext('Edit')}
                            </li>
                            <li class="remove-link" title="${gettext('Remove link')}">
                                ${gettext('Remove')}
                            </li>` :
                            ''
                        }
                    </ul>` :
                    ''
                }
                ${
                    anchorMark ?
                    `<div class="drop-up-head">
                        <div class="link-title">${gettext('Anchor')}</div>
                        <div class="link-href">
                        <a class="href" target="_blank" href="${anchorHref}">
                            ${anchorHref}
                        </a>
                        </div>
                    </div>
                    <ul class="drop-up-options">
                        <li class="copy-anchor" title="${gettext('Copy anchor')}">
                            ${gettext('Copy anchor')}
                        </li>
                        ${
                            writeAccess ?
                            `<li class="remove-anchor" title="${gettext('Remove anchor')}">
                                ${gettext('Remove')}
                            </li>` :
                            ''
                        }
                    </ul>` :
                    ''
                }
            </div>`

        const copyLinkHref = dropUp.querySelector('.copy-link')
        if (copyLinkHref) {
            copyLinkHref.addEventListener('mousedown',
                event => {
                    event.preventDefault()
                    event.stopImmediatePropagation()
                    copyLink(linkHref)
                }
            )
        }
        const copyAnchorHref = dropUp.querySelector('.copy-anchor')
        if (copyAnchorHref) {
            copyAnchorHref.addEventListener('mousedown',
                () => {
                    event.preventDefault()
                    event.stopImmediatePropagation()
                    copyLink(anchorHref)
                }
            )
        }

        const editLink = dropUp.querySelector('.edit-link')
        if (editLink) {
            editLink.addEventListener('mousedown',
                event => {
                    event.preventDefault()
                    event.stopImmediatePropagation()
                    const dialog = new LinkDialog(editor)
                    dialog.init()
                }
            )
        }

        const removeLink = dropUp.querySelector('.remove-link')
        if (removeLink) {
            removeLink.addEventListener('mousedown',
                event => {
                    event.preventDefault()
                    event.stopImmediatePropagation()
                    editor.view.dispatch(editor.view.state.tr.removeMark(
                        $head.start(), $head.end(), linkMark))
                }
            )
        }

        const removeAnchor = dropUp.querySelector('.remove-anchor')
        if (removeAnchor) {
            removeAnchor.addEventListener('mousedown',
                event => {
                    event.preventDefault()
                    event.stopImmediatePropagation()
                    editor.view.dispatch(editor.view.state.tr.removeMark(
                        $head.start(), $head.end(), anchorMark))
                }
            )
        }

        return dropUp
    }

    return new Plugin({
        key,
        state: {
            init() {
                return {
                    url: window.location.href,
                    decos: DecorationSet.empty,
                    linkMark: false
                }
            },
            apply(tr, prev, oldState, state) {
                let {
                    url,
                    decos,
                    linkMark,
                    anchorMark
                } = this.getState(oldState)
                url = getUrl(state, oldState, url)
                const newLinkMark = getLinkMark(state)
                const newAnchorMark = getAnchorMark(state)
                if (newLinkMark === linkMark && newAnchorMark === anchorMark) {
                    decos = decos.map(tr.mapping, tr.doc)
                } else {
                    decos = getDecos(state)
                    linkMark = newLinkMark
                    anchorMark = newAnchorMark
                }
                return {
                    url,
                    decos,
                    linkMark,
                    anchorMark
                }
            }
        },
        appendTransaction: (trs, oldState, newState) => {
            // Check if any of the transactions are local.
            if (trs.every(tr => !tr.docChanged || tr.getMeta('remote'))) {
                // All transactions are remote or don't change anything. Give up.
                return
            }
            // Check if there are any headings or figures in the affected range.
            // Otherwise, skip.
            let ranges = []
            trs.forEach(tr => {
                tr.steps.forEach((step, index) => {
                    if (step.jsonID ===
                        'replace' || step.jsonID ===
                        'replaceAround') {
                        ranges.push([step.from,
                            step.to
                        ])
                    }
                    ranges = ranges.map(range => {
                        return [
                            tr
                            .mapping
                            .maps[
                                index
                            ].map(
                                range[
                                    0
                                ], -
                                1),
                            tr
                            .mapping
                            .maps[
                                index
                            ].map(
                                range[
                                    1
                                ],
                                1)
                        ]
                    })
                })
            })
            let foundIdElement = false, // found heading or figure
                foundAnchorWithoutId = false // found an anchor without an ID
            ranges.forEach(range => {
                newState.doc.nodesBetween(
                    range[0],
                    range[1],
                    node => {
                        if (
                            node.type.groups.includes('heading') ||
                            node.type.name === 'figure'
                        ) {
                            foundIdElement = true
                        }
                        node.marks.forEach(mark => {
                            if (mark.type.name === 'anchor' && !mark.attrs.id) {
                                foundAnchorWithoutId = true
                            }
                        })
                    }
                )
            })

            if (!foundIdElement && !foundAnchorWithoutId) {
                return
            }

            // Check that unique IDs only exist once in the document
            // If an ID is used more than once, add steps to change the ID of all
            // but the first occurence.
            const headingIds = [],
                doubleHeadingIds = [],
                figureIds = [],
                doubleFigureIds = []

            // ID should not be found in the other pm either. So we look through
            // those as well.
            const otherState = oldState.schema === options.editor.view.state.schema ?
                options.editor.mod.footnotes.fnEditor.view.state :
                options.editor.view.state

            otherState.doc.descendants(node => {
                if (node.type.groups.includes('heading')) {
                    headingIds.push(node.attrs.id)
                } else if (node.type.name === 'figure') {
                    figureIds.push(node.attrs.id)
                }
            })

            newState.doc.descendants((node, pos) => {
                if (node.type.groups.includes('heading')) {
                    if (headingIds.includes(node.attrs.id) || !node.attrs.id) {
                        // Add node if the id is false (default) or it is present twice
                        doubleHeadingIds.push({
                            node,
                            pos
                        })
                    }
                    headingIds.push(node.attrs.id)
                }

                if (node.type.name === 'figure') {
                    // Add node if the id is false (default) or it is present twice
                    if (figureIds.includes(node.attrs.id) || !node.attrs.id) {
                        doubleFigureIds.push({
                            node,
                            pos
                        })
                    }
                    figureIds.push(node.attrs.id)
                }

            })

            if (!doubleHeadingIds.length && !doubleFigureIds.length) {
                return
            }

            const newTransaction = newState.tr.setMeta('fixIds', true)
            // Change the IDs of the nodes that having an ID that was used previously
            // already.
            doubleHeadingIds.forEach(doubleId => {
                let id

                while (!id || headingIds.includes(id)) {
                    id = randomHeadingId()
                }

                const attrs = Object.assign({}, doubleId.node.attrs, {id})

                // Because we only change attributes, positions should stay the
                // the same throughout all our extra steps. We therefore do no
                // mapping of positions through these steps.
                newTransaction.setNodeMarkup(doubleId.pos, null, attrs)

                headingIds.push(id)
            })


            doubleFigureIds.forEach(doubleId => {
                let id

                while (!id || figureIds.includes(id)) {
                    id = randomFigureId()
                }

                const attrs = Object.assign({}, doubleId.node.attrs, {id})

                // Because we only change attributes, positions should stay the
                // the same throughout all our extra steps. We therefore do no
                // mapping of positions through these steps.
                newTransaction.setNodeMarkup(doubleId.pos, null, attrs)
                figureIds.push(id)
            })

            // Remove anchor marks without ID
            if (foundAnchorWithoutId) {
                const markType = newState.schema.marks.anchor.create({id : false})
                newTransaction.step(
                    new RemoveMarkStep(
                        0,
                        newState.doc.content.size,
                        markType
                    )
                )
            }
            return newTransaction
        },
        props: {
            handleDOMEvents: {
                focus: (view, _event) => {
                    const {
                        url
                    } = key.getState(view.state)
                    window.history.replaceState("", "", url)
                }
            },
            decorations(state) {
                const {
                    decos
                } = this.getState(state)
                return decos
            }
        }
    })
}
