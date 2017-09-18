import {Plugin, PluginKey} from "prosemirror-state"
import {Decoration, DecorationSet} from "prosemirror-view"
import {ReplaceAroundStep, RemoveMarkStep} from "prosemirror-transform"
import {Slice, Fragment} from "prosemirror-model"
import {noSpaceTmp, addAlert} from "../../common"
import {randomHeadingId, randomFigureId} from "../../schema/common"
import {LinkDialog} from "../dialogs"

const key = new PluginKey('links')

let copyLink = function(href) {
    let textarea = document.createElement("textarea")
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
        console.warn("Copy to clipboard failed.", ex)
    }
}

export let linksPlugin = function(options) {


    function createDropUp(linkMark, anchorMark, $head) {
        let dropUp = document.createElement('span'),
            editor = options.editor,
            writeAccess = editor.docInfo.access_rights === 'write' ? true : false,
            linkType, linkHref, anchorHref, requiredPx = 10

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
                    `<a class="href"
                            ${linkType === 'external' ? 'target="_blank"' : ''} href="${linkHref}">
            		${linkHref}
            		</a>&nbsp;
                    <button class="fw-button fw-light fw-large fw-square copy-link" title="${gettext('Copy link')}">
                        <span class="ui-button-text">
                            <i class="fa fa-clipboard"></i>
                        </span>
                    </button><br>
            		${gettext('Title')}:&nbsp;${linkMark.attrs.title}
            		${writeAccess ? noSpaceTmp`
                        <div class="edit">
                            [ <a href="#" class="edit-link">${gettext('Edit')}</a> |
                            <a href="#" class="remove-link">${gettext('Remove')}</a>]
                        </div>
                    ` : ''}
                    ` :
                    ''
                }
                ${
                    anchorMark && linkMark ? '<hr>' : ''
                }
                ${
                    anchorMark ?
                    `${anchorHref}&nbsp;
                    <button class="fw-button fw-light fw-large fw-square copy-anchor" title="${gettext('Copy link')}">
                        <span class="ui-button-text">
                            <i class="fa fa-clipboard"></i>
                        </span>
                    </button><br>
            		${writeAccess ? noSpaceTmp`
                        <div class="edit">
                            [<a href="#" class="remove-anchor">${gettext('Remove')}</a>]
                        </div>
                    ` : ''}
                    ` :
                    ''
                }
            </div>`

        let copyLinkHref = dropUp.querySelector('.copy-link')
        if (copyLinkHref) {
            copyLinkHref.addEventListener('click',
                event => {
                    event.preventDefault()
                    console.log('clcicke')
                    copyLink(linkHref)
                }
            )
        }
        let copyAnchorHref = dropUp.querySelector('.copy-anchor')
        if (copyAnchorHref) {
            copyAnchorHref.addEventListener('click',
                () => copyLink(anchorHref)
            )
        }

        let editLink = dropUp.querySelector('.edit-link')
        if (editLink) {
            editLink.addEventListener('click',
                event => {
                    event.preventDefault()
                    let dialog = new LinkDialog(editor)
                    dialog.init()
                }
            )
        }

        let removeLink = dropUp.querySelector('.remove-link')
        if (removeLink) {
            removeLink.addEventListener('click',
                event => {
                    event.preventDefault()
                    editor.view.dispatch(editor.view.state.tr.removeMark(
                        $head.start(), $head.end(), linkMark))
                }
            )
        }

        let removeAnchor = dropUp.querySelector('.remove-anchor')
        if (removeAnchor) {
            removeAnchor.addEventListener('click',
                event => {
                    event.preventDefault()
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
                    url: window.location.href
                }
            },
            apply(tr, prev, oldState, state) {
                let {
                    url
                } = this.getState(oldState)
                let id = state.selection.$head.parent.attrs.id,
                    mark = state.selection.$head.marks().find(mark =>
                        mark.type.name === 'anchor'),
                    newUrl = url.split('#')[0]
                if (mark) {
                    newUrl += `#${mark.attrs.id}`
                } else if (id) {
                    newUrl += `#${id}`
                }
                let changed = url === newUrl ? false : true
                // TODO: Should the following be moved to a view?
                // Not sure if this counts as a DOM update.
                if (changed && options.editor.currentView.state === oldState) {
                    window.history.replaceState("", "", newUrl)
                }
                return {
                    url: newUrl
                }
            }
        },
        appendTransaction: (transactions, oldState, state) => {
            // Check if any of the transactions are local.
            if (transactions.every(transaction => transaction.getMeta(
                    'remote'))) {
                // All transactions are remote. Give up.
                return
            }
            // Check if there are any headings or figures in the affected range.
            // Otherwise, skip.
            let ranges = []
            transactions.forEach(transaction => {
                transaction.steps.forEach((step, index) => {
                    if (step.jsonID ===
                        'replace' || step.jsonID ===
                        'replaceAround') {
                        ranges.push([step.from,
                            step.to
                        ])
                    }
                    ranges = ranges.map(range => {
                        return [
                            transaction
                            .mapping
                            .maps[
                                index
                            ].map(
                                range[
                                    0
                                ], -
                                1),
                            transaction
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
            let transaction = transactions.slice(-1)[0],
                foundIdElement = false, // found heading or figure
                foundAnchorWithoutId = false // found an anchor without an ID
            ranges.forEach(range => {
                transaction.doc.nodesBetween(
                    range[0],
                    range[1],
                    (node, pos, parent) => {
                        if (node.type.name ===
                            'heading' || node.type.name ===
                            'figure') {
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
            let headingIds = [],
                doubleHeadingIds = []
            let figureIds = [],
                doubleFigureIds = []

            // ID should not be found in the other pm either. So we look through
            // those as well.
            let otherState = oldState === options.editor.view.state ?
                options.editor.mod.footnotes.fnEditor.view.state :
                options.editor.view.state

            otherState.doc.descendants(node => {
                if (node.type.name === 'heading') {
                    headingIds.push(node.attrs.id)
                } else if (node.type.name === 'figure') {
                    figureIds.push(node.attrs.id)
                }
            })

            transaction.doc.descendants((node, pos) => {
                if (node.type.name === 'heading') {
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


            let newTransaction = state.tr
            // Change the IDs of the nodes that having an ID that was used previously
            // already.
            doubleHeadingIds.forEach(doubleId => {
                let node = doubleId.node,
                    posFrom = doubleId.pos,
                    posTo = posFrom + node.nodeSize,
                    blockId

                while (!blockId || headingIds.includes(
                        blockId)) {
                    blockId = randomHeadingId()
                }

                let attrs = {
                    level: node.attrs.level,
                    id: blockId
                }
                // Because we only change attributes, positions should stay the
                // the same throughout all our extra steps. We therefore do no
                // mapping of positions through these steps.

                newTransaction.step(
                    new ReplaceAroundStep(
                        posFrom,
                        posTo,
                        posFrom + 1,
                        posTo - 1,
                        new Slice(Fragment.from(
                            node.type.create(
                                attrs)), 0, 0),
                        1,
                        true
                    )
                )

                headingIds.push(blockId)
            })


            doubleFigureIds.forEach(doubleId => {
                let node = doubleId.node,
                    posFrom = doubleId.pos,
                    posTo = posFrom + node.nodeSize,
                    blockId

                while (!blockId || figureIds.includes(
                        blockId)) {
                    blockId = randomFigureId()
                }

                let attrs = {
                    equation: node.attrs.equation,
                    image: node.attrs.image,
                    figureCategory: node.attrs.figureCategory,
                    caption: node.attrs.caption,
                    id: blockId
                }

                // Because we only change attributes, positions should stay the
                // the same throughout all our extra steps. We therefore do no
                // mapping of positions through these steps.
                newTransaction.step(
                    new ReplaceAroundStep(
                        posFrom,
                        posTo,
                        posFrom + 1,
                        posTo - 1,
                        new Slice(Fragment.from(
                            node.type.create(
                                attrs)), 0, 0),
                        1,
                        true
                    )
                )

                figureIds.push(blockId)
            })

            // Remove anchor marks without ID
            if (foundAnchorWithoutId) {
                let markType = state.schema.marks.anchor.create({id : false})
                newTransaction.step(
                    new RemoveMarkStep(
                        0,
                        state.doc.content.size,
                        markType
                    )
                )
            }


            return newTransaction
        },
        props: {
            handleDOMEvents: {
                focus: (view, event) => {
                    let {
                        url
                    } = key.getState(view.state)
                    window.history.replaceState("", "", url)
                }
            },
            decorations(state) {
                const $head = state.selection.$head
                let currentMarks = [],
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
                    return
                }
                let startIndex = $head.index()
                while (
                    startIndex > 0 &&
                    currentMarks.some(mark => mark.isInSet(
                        $head.parent.child(startIndex-1).marks
                    ))
                ) {
                    startIndex--
                }
                let startPos = $head.start() // position of block start.
                for (let i = 0; i < startIndex; i++) {
                    startPos += $head.parent.child(i).nodeSize
                }

                let dom = createDropUp(linkMark, anchorMark, $head),
                    deco = Decoration.widget(startPos, dom)
                return DecorationSet.create(state.doc, [deco])
            }
        }
    })
}
