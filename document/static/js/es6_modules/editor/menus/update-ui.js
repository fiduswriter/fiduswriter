import {UpdateScheduler} from "prosemirror/dist/ui/update"


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

const PART_LABELS = {
    'title': gettext('Title'),
    'metadatasubtitle': gettext('Subtitle'),
    'metadataauthors': gettext('Authors'),
    'metadataabstract': gettext('Abstract'),
    'metadatakeywords': gettext('Keywords'),
    'documentcontents': gettext('Body')
}

export class ModMenusUpdateUI {

    constructor(mod) {
        mod.updateUI = this
        this.mod = mod
        this.placeHolderCss = ''
        this.bindEvents()
    }

    bindEvents() {
        let that = this
        new UpdateScheduler(this.mod.editor.pm, "selectionChange change activeMarkChange blur focus setDoc", function() {
            return that.updateUI()
        })
        new UpdateScheduler(this.mod.editor.mod.footnotes.fnPm, "selectionChange change activeMarkChange blur focus setDoc", function() {
            return that.updateUI()
        })
    }

    updateUI() {
        let pm = this.mod.editor.pm, fnPm = this.mod.editor.mod.footnotes.fnPm,
          currentPm = this.mod.editor.currentPm

        // We count on the the title node being the first one in the document
        const documentTitle = pm.doc.firstChild.type.name === 'title' &&
            pm.doc.firstChild.textContent.length > 0 ?
            pm.doc.firstChild.textContent : gettext('Untitled Document')


        jQuery('title').html('Fidus Writer - ' + documentTitle)
        jQuery('#header h1').html(documentTitle)

        const marks = currentPm.activeMarks()
        const strong = marks.some(function(mark) {
            return (mark.type.name === 'strong')
        })

        if (strong) {
            jQuery('#button-bold').addClass('ui-state-active')
        } else {
            jQuery('#button-bold').removeClass('ui-state-active')
        }

        const em = marks.some(function(mark) {
            return (mark.type.name === 'em')
        })

        if (em) {
            jQuery('#button-italic').addClass('ui-state-active')
        } else {
            jQuery('#button-italic').removeClass('ui-state-active')
        }

        const link = marks.some(function(mark) {
            return (mark.type.name === 'link')
        })

        if (link) {
            jQuery('#button-link').addClass('ui-state-active')
        } else {
            jQuery('#button-link').removeClass('ui-state-active')
        }

        if (pm.history.undoDepth > 0) {
            jQuery('#button-undo').removeClass('disabled')
        } else {
            jQuery('#button-undo').addClass('disabled')
        }

        if (pm.history.redoDepth > 0) {
            jQuery('#button-redo').removeClass('disabled')
        } else {
            jQuery('#button-redo').addClass('disabled')
        }

        const rawStart = Math.min(currentPm.selection.from, currentPm.selection.to)
        const start = currentPm.doc.resolve(rawStart)
        const rawEnd = Math.max(currentPm.selection.from, currentPm.selection.to)
        const end = currentPm.doc.resolve(rawEnd)

        if (start.depth === 0 || end.depth === 0) {
            // The selection must be outermost elements. Do not go any further in
            // analyzing things.
            return
        }

        const startElement = start.node(1)
        const endElement = end.node(1)

        if (startElement !== endElement) {
            /* Selection goes across document parts or across footnotes */
            this.calculatePlaceHolderCss(pm)
            jQuery('.editortoolbar button').addClass('disabled')
            jQuery('#block-style-label').html('')
            jQuery('#current-position').html('')
            if (pm.selection.empty) {
                jQuery('#button-comment').addClass('disabled')
            } else {
                jQuery('#button-comment').removeClass('disabled')
            }
        } else {
            if (currentPm === pm) {
                this.calculatePlaceHolderCss(pm, startElement)
                jQuery('#current-position').html(PART_LABELS[startElement.type.name])

                switch (startElement.type.name) {
                    case 'title':
                    case 'metadatasubtitle':
                    case 'metadataauthors':
                    case 'metadatakeywords':
                        jQuery('.edit-button').addClass('disabled')
                        jQuery('#block-style-label').html('')
                        if (pm.selection.empty) {
                            jQuery('#button-comment').addClass('disabled')
                        } else {
                            jQuery('#button-comment').removeClass('disabled')
                        }

                        break
                    case 'metadataabstract':
                    case 'documentcontents':
                        jQuery('.edit-button').removeClass('disabled')

                        if (pm.selection.empty) {
                            jQuery('#button-link').addClass('disabled')
                            jQuery('#button-comment').addClass('disabled')
                        } else {
                            jQuery('#button-comment').removeClass('disabled')
                        }

                        if (startElement.type.name === 'metadataabstract') {
                            jQuery('#button-figure').addClass('disabled')
                        }

                        let blockNodeType = true

                        if (start.parent === end.parent) {
                            // Selection within a single block.
                            let blockNode = start.parent
                            blockNodeType = blockNode.type.name === 'heading' ? blockNode.type.name + '_' + blockNode.attrs.level : blockNode.type.name
                            jQuery('#block-style-label').html(BLOCK_LABELS[blockNodeType])
                        } else {
                            // The selection is crossing several blocks
                            pm.doc.nodesBetween(rawStart, rawEnd, function(node, pos, parent) {
                                if (node.isTextblock) {
                                    let nextBlockNodeType = node.type.name === 'heading' ? node.type.name + '_' + node.attrs.level : node.type.name
                                    if (blockNodeType === true) {
                                        blockNodeType = nextBlockNodeType
                                    }
                                    if (blockNodeType !== nextBlockNodeType) {
                                        blockNodeType = false
                                    }


                                }
                            })


                            if (blockNodeType) {
                                jQuery('#block-style-label').html(BLOCK_LABELS[blockNodeType])
                            } else {
                                jQuery('#block-style-label').html('')
                            }
                        }
                        break
                }
            } else {
                // In footnote editor
                jQuery('#current-position').html(gettext('Footnote'))
                let blockNode = start.parent
                blockNodeType = blockNode.type.name === 'heading' ? blockNode.type.name
                    + '_' + blockNode.attrs.level : blockNode.type.name
                jQuery('#block-style-label').html(BLOCK_LABELS[blockNodeType])

                // Enable all editing buttons, except comment and footnote
                jQuery('.edit-button').removeClass('disabled')
                jQuery('#button-comment').addClass('disabled')
                jQuery('#button-footnote').addClass('disabled')
            }

        }
        return
    }


    /** Show or hide placeHolders ('Contents...', 'Title...', etc.) depending on
    whether these elements are empty or not.
    TODO: placeholder calculation should probably be somewhere else, not in the
    updating procedures of the menus.
    */

    calculatePlaceHolderCss(pm, selectedElement) {
        let newPlaceHolderCss = '',
            i = 0,
            placeHolders = [{
                'type': 'title',
                'selector': '#document-title',
                'placeHolder': gettext('Title...')
            }, {
                'type': 'metadatasubtitle',
                'selector': '#metadata-subtitle',
                'placeHolder': gettext('Subtitle...')
            }, {
                'type': 'metadaauthors',
                'selector': '#metadata-authors',
                'placeHolder': gettext('Authors...')
            }, {
                'type': 'metadataabstract',
                'selector': '#metadata-abstract',
                'placeHolder': gettext('Abstract...')
            }, {
                'type': 'metadatakeywords',
                'selector': '#metadata-keywords',
                'placeHolder': gettext('Keywords...')
            }, {
                'type': 'documentcontents',
                'selector': '#document-contents',
                'placeHolder': gettext('Body...')
            }]

        placeHolders.forEach(function(elementType, index) {
            let partElement = pm.doc.child(i)
            if (partElement.type.name == !elementType.type) {
                return false
            }
            if (partElement.textContent.length === 0 &&
                (selectedElement != partElement || !pm.hasFocus())) {
                newPlaceHolderCss += elementType.selector + ':before {content: "' +
                    elementType.placeHolder + '"}\n'
            }
            i++
        })
        if (this.placeHolderCss !== newPlaceHolderCss) {
            this.placeHolderCss = newPlaceHolderCss
            document.getElementById('placeholder-styles').innerHTML = newPlaceHolderCss
        }

    }



}
