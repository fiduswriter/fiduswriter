import {wrapIn, toggleMark} from "prosemirror-commands"
import {wrapInList} from "prosemirror-schema-list"
import {undo, redo, undoDepth, redoDepth} from "prosemirror-history"

import {CitationDialog, FigureDialog, LinkDialog, MathDialog} from "../../dialogs"
import {READ_ONLY_ROLES, COMMENT_ONLY_ROLES} from "../.."
import {randomAnchorId} from "../../../schema/common"
import {setBlockType} from "../../keymap"

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

export const toolbarModel = () => ({
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
            },
            order: 0
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
            },
            order: 1

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
                    const selectedNode = editor.currentView.state.selection.node
                    return BLOCK_LABELS[
                        selectedNode.type.name === 'heading' ?
                        `${selectedNode.type.name}_${selectedNode.attrs.level}` :
                        selectedNode.type.name
                    ]
                }
                const startElement = editor.currentView.state.selection.$anchor.parent,
                    endElement = editor.currentView.state.selection.$head.parent
                if (!startElement || !endElement) {
                    return ''
                } else if (startElement === endElement) {
                    const blockNodeType = startElement.type.name === 'heading' ?
                        `${startElement.type.name}_${startElement.attrs.level}` :
                        startElement.type.name
                    return BLOCK_LABELS[blockNodeType] ? BLOCK_LABELS[blockNodeType] : ''
                } else {
                    let blockNodeType = true
                    editor.currentView.state.doc.nodesBetween(
                        editor.currentView.state.selection.from,
                        editor.currentView.state.selection.to,
                        node => {
                            if (node.isTextblock) {
                                const nextBlockNodeType = node.type.name === 'heading' ?
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
                        const view = editor.currentView
                        setBlockType(view.state.schema.nodes.paragraph)(view.state, view.dispatch)
                    },
                    order: 0
                },
                {
                    title: BLOCK_LABELS['heading_1'],
                    action: editor => {
                        const view = editor.currentView
                        setBlockType(view.state.schema.nodes.heading, {level: 1})(view.state, view.dispatch)
                    },
                    order: 1
                },
                {
                    title: BLOCK_LABELS['heading_2'],
                    action: editor => {
                        const view = editor.currentView
                        setBlockType(view.state.schema.nodes.heading, {level: 2})(view.state, view.dispatch)
                    },
                    order: 2
                },
                {
                    title: BLOCK_LABELS['heading_3'],
                    action: editor => {
                        const view = editor.currentView
                        setBlockType(view.state.schema.nodes.heading, {level: 3})(view.state, view.dispatch)
                    },
                    order: 3
                },
                {
                    title: BLOCK_LABELS['heading_4'],
                    action: editor => {
                        const view = editor.currentView
                        setBlockType(view.state.schema.nodes.heading, {level: 4})(view.state, view.dispatch)
                    },
                    order: 4
                },
                {
                    title: BLOCK_LABELS['heading_5'],
                    action: editor => {
                        const view = editor.currentView
                        setBlockType(view.state.schema.nodes.heading, {level: 5})(view.state, view.dispatch)
                    },
                    order: 5
                },
                {
                    title: BLOCK_LABELS['heading_6'],
                    action: editor => {
                        const view = editor.currentView
                        setBlockType(view.state.schema.nodes.heading, {level: 6})(view.state, view.dispatch)
                    },
                    order: 6
                },
                {
                    title: BLOCK_LABELS['code_block'],
                    action: editor => {
                        const view = editor.currentView
                        setBlockType(view.state.schema.nodes.code_block)(view.state, view.dispatch)
                    },
                    order: 7
                }
            ],
            order: 2
        },
        {
            type: 'button',
            title: gettext('Bold'),
            icon: 'bold',
            action: editor => {
                const mark = editor.currentView.state.schema.marks['strong']
                const command = toggleMark(mark)
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
                const storedMarks = editor.currentView.state.storedMarks
                if (
                    storedMarks && storedMarks.some(mark => mark.type.name === 'strong') ||
                    editor.currentView.state.selection.$head.marks().some(mark => mark.type.name === 'strong')
                ) {
                    return true
                } else {
                    return false
                }

            },
            order: 3
        },
        {
            type: 'button',
            title: gettext('Italic'),
            icon: 'italic',
            action: editor => {
                const mark = editor.currentView.state.schema.marks['em']
                const command = toggleMark(mark)
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
                const storedMarks = editor.currentView.state.storedMarks
                if (
                    storedMarks && storedMarks.some(mark => mark.type.name === 'em') ||
                    editor.currentView.state.selection.$head.marks().some(mark => mark.type.name === 'em')
                ) {
                    return true
                } else {
                    return false
                }

            },
            order: 4
        },
        {
            type: 'button',
            title: gettext('Numbered list'),
            icon: 'list-ol',
            action: editor => {
                const node = editor.currentView.state.schema.nodes['ordered_list']
                const command = wrapInList(node)
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
            },
            order: 5
        },
        {
            type: 'button',
            title: gettext('Bullet list'),
            icon: 'list-ul',
            action: editor => {
                const node = editor.currentView.state.schema.nodes['bullet_list']
                const command = wrapInList(node)
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
            },
            order: 6
        },
        {
            type: 'button',
            title: gettext('Blockquote'),
            icon: 'quote-right',
            action: editor => {
                const node = editor.currentView.state.schema.nodes['blockquote']
                const command = wrapIn(node)
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
            },
            order: 7
        },
        {
            id: 'link',
            type: 'button',
            title: gettext('Link'),
            icon: 'link',
            action: editor => {
                const dialog = new LinkDialog(editor)
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
            selected: editor => editor.currentView.state.selection.$head.marks().some(mark => mark.type.name === 'link'),
            order: 8
        },
        {
            type: 'button',
            title: gettext('Footnote'),
            icon: 'asterisk',
            action: editor => {
                const node = editor.view.state.schema.nodes['footnote']
                const tr = editor.view.state.tr.replaceSelectionWith(node.createAndFill())
                editor.view.dispatch(tr)
                return false
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
            },
            order: 9
        },
        {
            type: 'button',
            title: gettext('Cite'),
            icon: 'book',
            action: editor => {
                const dialog = new CitationDialog(editor)
                dialog.init()
                return false
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
            },
            order: 10
        },
        {
            type: 'button',
            title: gettext('Horizontal line'),
            icon: 'minus',
            action: editor => {
                const view = editor.currentView,
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
            },
            order: 11
        },
        {
            type: 'button',
            title: gettext('Math'),
            icon: 'percent',
            action: editor => {
                const dialog = new MathDialog(editor)
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
            },
            order: 12
        },
        {
            type: 'button',
            title: gettext('Figure'),
            icon: 'picture-o',
            action: editor => {
                const dialog = new FigureDialog(editor)
                dialog.init()
                return false
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
            },
            order: 13
        },
        {
            type: 'button',
            title: gettext('Undo'),
            icon: 'undo',
            action: editor => undo(editor.currentView.state, tr => editor.currentView.dispatch(tr.setMeta('inputType', 'historyUndo'))),
            disabled: editor => undoDepth(editor.currentView.state) === 0,
            order: 14
        },
        {
            type: 'button',
            title: gettext('Redo'),
            icon: 'repeat',
            action: editor => redo(editor.currentView.state, tr => editor.currentView.dispatch(tr.setMeta('inputType', 'historyRedo'))),
            disabled: editor => redoDepth(editor.currentView.state) === 0,
            order: 15
        },
        {
            type: 'button',
            title: gettext('Comment'),
            icon: 'comment-o',
            action: editor => {
                editor.mod.comments.interactions.createNewComment()
                return false
            },
            disabled: editor => {
                if (READ_ONLY_ROLES.includes(editor.docInfo.access_rights)) {
                    return true
                } else if (editor.currentView.state.selection.empty) {
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

            },
            order: 16
        },
        {
            type: 'button',
            title: gettext('Anchor'),
            icon: 'anchor',
            action: editor => {
                const mark = editor.currentView.state.schema.marks['anchor']
                const command = toggleMark(mark, {id: randomAnchorId()})
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

            },
            order: 17
        }
    ]
})
