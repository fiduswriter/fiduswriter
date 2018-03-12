import {setBlockType, wrapIn, toggleMark} from "prosemirror-commands"
import {wrapInList} from "prosemirror-schema-list"
import {undo, redo, undoDepth, redoDepth} from "prosemirror-history"

import {CitationDialog, FigureDialog, LinkDialog, MathDialog} from "../../dialogs"
import {READ_ONLY_ROLES, COMMENT_ONLY_ROLES} from "../.."
import {randomHeadingId, randomAnchorId} from "../../../schema/common"


let setHeadlineBlock = function(editor, level) {
    let block = editor.currentView.state.schema.nodes['heading'],
        attrs = {level}

    if (
        editor.currentView.state.selection.$from.parent &&
        editor.currentView.state.selection.$from.parent.attrs &&
        editor.currentView.state.selection.$from.parent.attrs.id &&
        editor.currentView.state.selection.$from.parent.attrs.id.length
    ) {
        attrs.id = editor.currentView.state.selection.$from.parent.attrs.id
    } else {
        attrs.id = randomHeadingId()
    }

    let command = setBlockType(block, attrs)
    command(editor.currentView.state, tr => editor.currentView.dispatch(tr))
}


const PART_LABELS = {
    'title': gettext('Title'),
    'subtitle': gettext('Subtitle'),
    'authors': gettext('Authors'),
    'abstract': gettext('Abstract'),
    'keywords': gettext('Keywords'),
    'body': gettext('Body')
}

const BLOCK_LABELS = {
    'paragraph': gettext('Normal Text'),
    'heading_1': gettext('1st Heading'),
    'heading_2': gettext('2nd Heading'),
    'heading_3': gettext('3rd Heading'),
    'heading_4': gettext('4th Heading'),
    'heading_5': gettext('5th Heading'),
    'heading_6': gettext('6th Heading'),
    'code_block': gettext('Code'),
    'figure': gettext('Figure')
}

export const TEXT_ONLY_PARTS = ['title', 'subtitle', 'authors', 'keywords']

export let toolbarModel = {
    openMore: false, // whether 'more' menu is opened.
    content: [
        {
            type: 'button',
            title: gettext('Open/close header menu'),
            icon: editor => {
                if (editor.menu.headerbarModel.open) {
                    return 'angle-double-up'
                } else {
                    return 'angle-double-down'
                }
            },
            action: editor => {
                editor.menu.headerbarModel.open = !editor.menu.headerbarModel.open
                if (editor.menu.headerView) {
                    editor.menu.headerView.update()
                }
            },
            class: editor => {
                if (editor.menu.headerbarModel.open) {
                    return 'no-border'
                } else {
                    return 'no-border header-closed'
                }
            }
        },
        {
            type: 'info',
            show: editor => {
                if (editor.currentView !== editor.view) {
                    return gettext('Footnote')
                } else if (
                    editor.currentView.state.selection.$anchor.node(2) &&
                    editor.currentView.state.selection.$anchor.node(2) === editor.currentView.state.selection.$head.node(2)
                ) {
                    return PART_LABELS[editor.currentView.state.selection.$anchor.node(2).type.name]
                } else {
                    return ''
                }
            }

        },
        {
            type: 'dropdown',
            show: editor => {
                if (
                    editor.currentView.state.selection.$anchor.node(2) &&
                    TEXT_ONLY_PARTS.includes(
                        editor.currentView.state.selection.$anchor.node(2).type.name
                    )
                ) {
                    return ''
                }
                if (
                    editor.currentView.state.selection.jsonID === 'node' &&
                    editor.currentView.state.selection.node.isBlock
                ) {
                    let selectedNode = editor.currentView.state.selection.node
                    return BLOCK_LABELS[
                        selectedNode.type.name === 'heading' ?
                        `${selectedNode.type.name}_${selectedNode.attrs.level}` :
                        selectedNode.type.name
                    ]
                }
                let startElement = editor.currentView.state.selection.$anchor.parent,
                    endElement = editor.currentView.state.selection.$head.parent
                if (!startElement || !endElement) {
                    return ''
                } else if (startElement === endElement) {
                    let blockNodeType = startElement.type.name === 'heading' ?
                        `${startElement.type.name}_${startElement.attrs.level}` :
                        startElement.type.name
                    return BLOCK_LABELS[blockNodeType] ? BLOCK_LABELS[blockNodeType] : ''
                } else {
                    let blockNodeType = true
                    editor.currentView.state.doc.nodesBetween(
                        editor.currentView.state.selection.from,
                        editor.currentView.state.selection.to,
                        (node, pos, parent) => {
                            if (node.isTextblock) {
                                let nextBlockNodeType = node.type.name === 'heading' ?
                                    `${node.type.name}_${node.attrs.level}` :
                                    node.type.name
                                if (blockNodeType === true) {
                                    blockNodeType = nextBlockNodeType
                                }
                                if (blockNodeType !== nextBlockNodeType) {
                                    blockNodeType = false
                                }
                            }
                        }
                    )

                    if (blockNodeType) {
                        return BLOCK_LABELS[blockNodeType] ? BLOCK_LABELS[blockNodeType] : ''
                    } else {
                        return ''
                    }
                }

            },
            disabled: editor =>
                    READ_ONLY_ROLES.includes(editor.docInfo.access_rights) ||
                    COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights) ||
                    (
                        editor.currentView.state.selection.$anchor.node(2) &&
                        TEXT_ONLY_PARTS.includes(
                            editor.currentView.state.selection.$anchor.node(2).type.name
                        )
                    ) || (
                        editor.currentView.state.selection.jsonID === 'node' &&
                        editor.currentView.state.selection.node.isBlock &&
                        !editor.currentView.state.selection.node.isTextblock
                    ) ||
                        editor.currentView.state.selection.jsonID === 'gapcursor',
            content: [
                {
                    title: BLOCK_LABELS['paragraph'],
                    action: editor => {
                        let block = editor.currentView.state.schema.nodes['paragraph']

                        let command = setBlockType(block)
                        command(editor.currentView.state, tr => editor.currentView.dispatch(tr))
                    }
                },
                {
                    title: BLOCK_LABELS['heading_1'],
                    action: editor => setHeadlineBlock(editor, 1)
                },
                {
                    title: BLOCK_LABELS['heading_2'],
                    action: editor => setHeadlineBlock(editor, 2)
                },
                {
                    title: BLOCK_LABELS['heading_3'],
                    action: editor => setHeadlineBlock(editor, 3)
                },
                {
                    title: BLOCK_LABELS['heading_4'],
                    action: editor => setHeadlineBlock(editor, 4)
                },
                {
                    title: BLOCK_LABELS['heading_5'],
                    action: editor => setHeadlineBlock(editor, 5)
                },
                {
                    title: BLOCK_LABELS['heading_6'],
                    action: editor => setHeadlineBlock(editor, 6)
                },
                {
                    title: BLOCK_LABELS['code_block'],
                    action: editor => {
                        let block = editor.currentView.state.schema.nodes['code_block']

                        let command = setBlockType(block)
                        command(editor.currentView.state, tr => editor.currentView.dispatch(tr))
                    }
                },

            ]
        },
        {
            type: 'button',
            title: gettext('Bold'),
            icon: 'bold',
            action: editor => {
                let mark = editor.currentView.state.schema.marks['strong']
                let command = toggleMark(mark)
                command(editor.currentView.state, tr => editor.currentView.dispatch(tr))
            },
            disabled: editor => {
                if (
                    READ_ONLY_ROLES.includes(editor.docInfo.access_rights) ||
                    COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights) ||
                    editor.currentView.state.selection.jsonID === 'gapcursor'
                ) {
                    return true
                } else if (
                    editor.currentView.state.selection.$anchor.node(2) &&
                    editor.currentView.state.selection.$anchor.node(2) === editor.currentView.state.selection.$head.node(2) &&
                    !TEXT_ONLY_PARTS.includes(editor.currentView.state.selection.$anchor.node(2).type.name)
                ) {
                    return false
                } else {
                    return true
                }
            },
            selected: editor => {
                let storedMarks = editor.currentView.state.storedMarks
                if (
                    storedMarks && storedMarks.some(mark => mark.type.name === 'strong') ||
                    editor.currentView.state.selection.$head.marks().some(mark => mark.type.name === 'strong')
                ) {
                    return true
                } else {
                    return false
                }

            }
        },
        {
            type: 'button',
            title: gettext('Italic'),
            icon: 'italic',
            action: editor => {
                let mark = editor.currentView.state.schema.marks['em']
                let command = toggleMark(mark)
                command(editor.currentView.state, tr => editor.currentView.dispatch(tr))
            },
            disabled: editor => {
                if (
                    READ_ONLY_ROLES.includes(editor.docInfo.access_rights) ||
                    COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights) ||
                    editor.currentView.state.selection.jsonID === 'gapcursor'
                ) {
                    return true
                } else if (
                    editor.currentView.state.selection.$anchor.node(2) &&
                    editor.currentView.state.selection.$anchor.node(2) === editor.currentView.state.selection.$head.node(2) &&
                    !TEXT_ONLY_PARTS.includes(editor.currentView.state.selection.$anchor.node(2).type.name)
                ) {
                    return false
                } else {
                    return true
                }
            },
            selected: editor => {
                let storedMarks = editor.currentView.state.storedMarks
                if (
                    storedMarks && storedMarks.some(mark => mark.type.name === 'em') ||
                    editor.currentView.state.selection.$head.marks().some(mark => mark.type.name === 'em')
                ) {
                    return true
                } else {
                    return false
                }

            }
        },
        {
            type: 'button',
            title: gettext('Numbered list'),
            icon: 'list-ol',
            action: editor => {
                let node = editor.currentView.state.schema.nodes['ordered_list']
                let command = wrapInList(node)
                command(editor.currentView.state, tr => editor.currentView.dispatch(tr))
            },
            disabled: editor => {
                if (READ_ONLY_ROLES.includes(editor.docInfo.access_rights) || COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights)) {
                    return true
                } else if (
                    editor.currentView.state.selection.$anchor.node(2) &&
                    editor.currentView.state.selection.$anchor.node(2) === editor.currentView.state.selection.$head.node(2) &&
                    !TEXT_ONLY_PARTS.includes(editor.currentView.state.selection.$anchor.node(2).type.name) &&
                    editor.currentView.state.selection.jsonID === 'text'
                ) {
                    return false
                } else {
                    return true
                }
            }
        },
        {
            type: 'button',
            title: gettext('Bullet list'),
            icon: 'list-ul',
            action: editor => {
                let node = editor.currentView.state.schema.nodes['bullet_list']
                let command = wrapInList(node)
                command(editor.currentView.state, tr => editor.currentView.dispatch(tr))
            },
            disabled: editor => {
                if (READ_ONLY_ROLES.includes(editor.docInfo.access_rights) || COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights)) {
                    return true
                } else if (
                    editor.currentView.state.selection.$anchor.node(2) &&
                    editor.currentView.state.selection.$anchor.node(2) === editor.currentView.state.selection.$head.node(2) &&
                    !TEXT_ONLY_PARTS.includes(editor.currentView.state.selection.$anchor.node(2).type.name) &&
                    editor.currentView.state.selection.jsonID === 'text'
                ) {
                    return false
                } else {
                    return true
                }
            }
        },
        {
            type: 'button',
            title: gettext('Blockquote'),
            icon: 'quote-right',
            action: editor => {
                let node = editor.currentView.state.schema.nodes['blockquote']
                let command = wrapIn(node)
                command(editor.currentView.state, tr => editor.currentView.dispatch(tr))
            },
            disabled: editor => {
                if (READ_ONLY_ROLES.includes(editor.docInfo.access_rights) || COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights)) {
                    return true
                } else if (
                    editor.currentView.state.selection.$anchor.node(2) &&
                    editor.currentView.state.selection.$anchor.node(2) === editor.currentView.state.selection.$head.node(2) &&
                    !TEXT_ONLY_PARTS.includes(editor.currentView.state.selection.$anchor.node(2).type.name) &&
                    editor.currentView.state.selection.jsonID === 'text'
                ) {
                    return false
                } else {
                    return true
                }
            }
        },
        {
            id: 'link',
            type: 'button',
            title: gettext('Link'),
            icon: 'link',
            action: editor => {
                let dialog = new LinkDialog(editor)
                dialog.init()
            },
            disabled: editor => {
                if (READ_ONLY_ROLES.includes(editor.docInfo.access_rights) || COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights)) {
                    return true
                } else if (
                    editor.currentView.state.selection.$anchor.node(2) &&
                    editor.currentView.state.selection.$anchor.node(2) === editor.currentView.state.selection.$head.node(2) &&
                    !TEXT_ONLY_PARTS.includes(editor.currentView.state.selection.$anchor.node(2).type.name) &&
                    editor.currentView.state.selection.jsonID === 'text'
                ) {
                    return false
                } else {
                    return true
                }
            },
            selected: editor => editor.currentView.state.selection.$head.marks().some(mark => mark.type.name === 'link')
        },
        {
            type: 'button',
            title: gettext('Footnote'),
            icon: 'asterisk',
            action: editor => {
                let node = editor.view.state.schema.nodes['footnote']
                let transaction = editor.view.state.tr.replaceSelectionWith(node.createAndFill())
                editor.view.dispatch(transaction)
            },
            disabled: editor => {
                if (READ_ONLY_ROLES.includes(editor.docInfo.access_rights) || COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights)) {
                    return true
                } else if (editor.view !== editor.currentView) {
                    return true
                } else if (
                    editor.currentView.state.selection.$anchor.node(2) &&
                    editor.currentView.state.selection.$anchor.node(2) === editor.currentView.state.selection.$head.node(2) &&
                    !TEXT_ONLY_PARTS.includes(editor.currentView.state.selection.$anchor.node(2).type.name) &&
                    editor.currentView.state.selection.jsonID === 'text'
                ) {
                    return false
                } else {
                    return true
                }
            }
        },
        {
            type: 'button',
            title: gettext('Cite'),
            icon: 'book',
            action: editor => {
                let dialog = new CitationDialog(editor)
                dialog.init()
            },
            disabled: editor => {
                if (READ_ONLY_ROLES.includes(editor.docInfo.access_rights) || COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights)) {
                    return true
                } else if (
                    editor.currentView.state.selection.$anchor.node(2) &&
                    editor.currentView.state.selection.$anchor.node(2) === editor.currentView.state.selection.$head.node(2) &&
                    !TEXT_ONLY_PARTS.includes(editor.currentView.state.selection.$anchor.node(2).type.name) &&
                    (
                        editor.currentView.state.selection.jsonID === 'text' ||
                        (
                            editor.currentView.state.selection.jsonID === 'node' &&
                            editor.currentView.state.selection.node.type.name === 'citation'
                        )
                    )
                ) {
                    return false
                } else {
                    return true
                }
            }
        },
        {
            type: 'button',
            title: gettext('Horizontal line'),
            icon: 'minus',
            action: editor => {
                let view = editor.currentView,
                    state = view.state
                view.dispatch(
                    state.tr.replaceSelectionWith(state.schema.node("horizontal_rule"))
                )
            },
            disabled: editor => {
                if (READ_ONLY_ROLES.includes(editor.docInfo.access_rights) || COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights)) {
                    return true
                } else if (
                    editor.currentView.state.selection.$anchor.node(2) &&
                    editor.currentView.state.selection.$anchor.node(2) === editor.currentView.state.selection.$head.node(2) &&
                    !TEXT_ONLY_PARTS.includes(editor.currentView.state.selection.$anchor.node(2).type.name) &&
                    editor.currentView.state.selection.jsonID === 'text'
                ) {
                    return false
                } else {
                    return true
                }
            }
        },
        {
            type: 'button',
            title: gettext('Math'),
            icon: 'percent',
            action: editor => {
                let dialog = new MathDialog(editor)
                dialog.init()
            },
            disabled: editor => {
                if (READ_ONLY_ROLES.includes(editor.docInfo.access_rights) || COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights)) {
                    return true
                } else if (
                    editor.currentView.state.selection.$anchor.node(2) &&
                    editor.currentView.state.selection.$anchor.node(2) === editor.currentView.state.selection.$head.node(2) &&
                    !TEXT_ONLY_PARTS.includes(editor.currentView.state.selection.$anchor.node(2).type.name) &&
                    (
                        editor.currentView.state.selection.jsonID === 'text' ||
                        (
                            editor.currentView.state.selection.jsonID === 'node' &&
                            editor.currentView.state.selection.node.type.name === 'equation'
                        )
                    )
                ) {
                    return false
                } else {
                    return true
                }
            }
        },
        {
            type: 'button',
            title: gettext('Figure'),
            icon: 'picture-o',
            action: editor => {
                let dialog = new FigureDialog(editor)
                dialog.init()
            },
            disabled: editor => {
                if (READ_ONLY_ROLES.includes(editor.docInfo.access_rights) || COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights)) {
                    return true
                } else if (
                    editor.currentView.state.selection.$anchor.node(2) &&
                    editor.currentView.state.selection.$anchor.node(2) === editor.currentView.state.selection.$head.node(2) &&
                    !TEXT_ONLY_PARTS.includes(editor.currentView.state.selection.$anchor.node(2).type.name) &&
                    editor.currentView.state.selection.$anchor.node(2).type.name !== 'abstract' &&
                    (
                        editor.currentView.state.selection.jsonID === 'text' ||
                        (
                            editor.currentView.state.selection.jsonID === 'node' &&
                            editor.currentView.state.selection.node.type.name === 'figure'
                        )
                    )
                ) {
                    return false
                } else {
                    return true
                }
            }
        },
        {
            type: 'button',
            title: gettext('Undo'),
            icon: 'undo',
            action: editor => undo(editor.currentView.state, tr => editor.currentView.dispatch(tr.setMeta('undo', true))),
            disabled: editor => undoDepth(editor.currentView.state) === 0
        },
        {
            type: 'button',
            title: gettext('Redo'),
            icon: 'repeat',
            action: editor => redo(editor.currentView.state, tr => editor.currentView.dispatch(tr.setMeta('redo', true))),
            disabled: editor => redoDepth(editor.currentView.state) === 0
        },
        {
            type: 'button',
            title: gettext('Comment'),
            icon: 'comment-o',
            action: editor => editor.mod.comments.interactions.createNewComment(),
            disabled: editor => {
                if (READ_ONLY_ROLES.includes(editor.docInfo.access_rights)) {
                    return true
                } else if (editor.view !== editor.currentView || editor.currentView.state.selection.empty) {
                    return true
                }
            },
            selected: editor => {
                if (
                    editor.currentView.state.selection.$head.marks().some(
                        mark => mark.type.name === 'comment'
                    )
                ) {
                    return true
                } else {
                    return false
                }

            }
        },
        {
            type: 'button',
            title: gettext('Anchor'),
            icon: 'anchor',
            action: editor => {
                let mark = editor.currentView.state.schema.marks['anchor']
                let command = toggleMark(mark, {id: randomAnchorId()})
                command(editor.currentView.state, tr => editor.currentView.dispatch(tr))
            },
            disabled: editor => {
                if (READ_ONLY_ROLES.includes(editor.docInfo.access_rights) || COMMENT_ONLY_ROLES.includes(editor.docInfo.access_rights)) {
                    return true
                } else if (editor.currentView.state.selection.empty) {
                    return true
                }
            },
            selected: editor => {
                if (
                    editor.currentView.state.selection.$head.marks().some(
                        mark => mark.type.name === 'anchor'
                    )
                ) {
                    return true
                } else {
                    return false
                }

            }
        }
    ]
}
