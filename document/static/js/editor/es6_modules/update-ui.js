// Update UI (adapted from ProseMirror's src/menu/update.js)
import {Pos} from "prosemirror/dist/model"

const MIN_FLUSH_DELAY = 200
const UPDATE_TIMEOUT = 200

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

export class UpdateUI {
  constructor(pm, events) {
    this.pm = pm

    this.mustUpdate = false
    this.updateInfo = null
    this.timeout = null
    this.lastFlush = 0
    this.placeHolderCss = ''

    this.events = events.split(" ")
    this.onEvent = this.onEvent.bind(this)
    this.force = this.force.bind(this)
    this.events.forEach(event => pm.on(event, this.onEvent))
    pm.on("flushed", this.onFlushed = this.onFlushed.bind(this))
  }

  detach() {
    clearTimeout(this.timeout)
    this.events.forEach(event => this.pm.off(event, this.onEvent))
    this.pm.off("flush", this.onFlush)
    this.pm.off("flushed", this.onFlushed)
  }

  onFlushed() {
    let now = Date.now()
    if (this.mustUpdate && (now - this.lastFlush) >= MIN_FLUSH_DELAY) {
      this.lastFlush = now
      clearTimeout(this.timeout)
      this.mustUpdate = false
      this.updateUI()
    }
  }

  onEvent() {
    this.mustUpdate = true
    clearTimeout(this.timeout)
    this.timeout = setTimeout(this.force, UPDATE_TIMEOUT)
  }

  force() {
    if (this.pm.operation) {
      this.onEvent()
    } else {
      this.mustUpdate = false
      this.updateInfo = null
      this.lastFlush = Date.now()
      clearTimeout(this.timeout)
      this.updateUI()
    }
  }

  updateUI() {
    /* Fidus Writer code */

    // We count on the the title node being the first one in the document
    const documentTitle = this.pm.doc.firstChild.type.name === 'title' &&
      this.pm.doc.firstChild.textContent.length > 0 ?
      this.pm.doc.firstChild.textContent : gettext('Untitled Document')


    // The title has changed. We will update our document. Mark it as changed so
    // that an update may be sent to the server.
    if (documentTitle.substring(0, 255) !== theDocument.title) {
        theDocument.title = documentTitle.substring(0, 255)
        theDocumentValues.titleChanged = true
    }

    jQuery('title').html('Fidus Writer - ' + documentTitle)
    jQuery('#header h1').html(documentTitle)

    const marks = this.pm.activeMarks()
    const strong = marks.some(function(mark){return (mark.type.name==='strong')})

    if (strong) {
        jQuery('#button-bold').addClass('ui-state-active')
    } else {
        jQuery('#button-bold').removeClass('ui-state-active')
    }

    const em = marks.some(function(mark){return (mark.type.name==='em')})

    if (em) {
        jQuery('#button-italic').addClass('ui-state-active')
    } else {
        jQuery('#button-italic').removeClass('ui-state-active')
    }

    const link = marks.some(function(mark){return (mark.type.name==='link')})

    if (link) {
        jQuery('#button-link').addClass('ui-state-active')
    } else {
        jQuery('#button-link').removeClass('ui-state-active')
    }


    const canUndo = this.pm.history.canUndo()

    if (canUndo) {
        jQuery('#button-undo').removeClass('disabled')
    } else {
        jQuery('#button-undo').addClass('disabled')
    }

    const canRedo = this.pm.history.canRedo()

    if (canRedo) {
        jQuery('#button-redo').removeClass('disabled')
    } else {
        jQuery('#button-redo').addClass('disabled')
    }

    const start = this.pm.selection.from.min(this.pm.selection.to)
    const end = this.pm.selection.from.max(this.pm.selection.to)
    const startElement = this.pm.doc.path([start.path[0]])
    const endElement = this.pm.doc.path([end.path[0]])

    if (startElement !== endElement) {
        /* Selection goes across document parts */
        this.calculatePlaceHolderCss()
        jQuery('.editortoolbar button').addClass('disabled')
        jQuery('#block-style-label').html('')
        jQuery('#current-position').html('')
        if (this.pm.selection.empty) {
            jQuery('#button-comment').addClass('disabled')
        } else {
            jQuery('#button-comment').removeClass('disabled')
        }
    } else {
        this.calculatePlaceHolderCss(startElement)
        jQuery('#current-position').html(PART_LABELS[startElement.type.name])

        switch (startElement.type.name) {
            case 'title':
            case 'metadatasubtitle':
            case 'metadataauthors':
            case 'metadatakeywords':
                jQuery('.edit-button').addClass('disabled')
                jQuery('#block-style-label').html('')
                if (this.pm.selection.empty) {
                    jQuery('#button-comment').addClass('disabled')
                } else {
                    jQuery('#button-comment').removeClass('disabled')
                }

                break
            case 'metadataabstract':
            case 'documentcontents':
                jQuery('.edit-button').removeClass('disabled')

                if (this.pm.selection.empty) {
                    jQuery('#button-link').addClass('disabled')
                    jQuery('#button-comment').addClass('disabled')
                } else {
                    jQuery('#button-comment').removeClass('disabled')
                }

                if(startElement.type.name==='metadataabstract') {
                    jQuery('#button-figure').addClass('disabled')
                }

                var blockNodeType = true, blockNode, nextBlockNodeType

                if (_(start.path).isEqual(end.path)) {
                  // Selection within a single block.
                  blockNode = this.pm.doc.path(start.path)
                  blockNodeType = blockNode.type.name === 'heading' ? blockNode.type.name + '_' + blockNode.attrs.level : blockNode.type.name
                  jQuery('#block-style-label').html(BLOCK_LABELS[blockNodeType])
                } else {
                  // The selection is crossing several blocks
                    this.pm.doc.nodesBetween(start,end, function(node, path, parent) {
                      if (node.isTextblock) {
                        nextBlockNodeType = node.type.name === 'heading' ? node.type.name + '_' + node.attrs.level : node.type.name
                        if (blockNodeType===true) {
                          blockNodeType = nextBlockNodeType
                        }
                        if (blockNodeType!==nextBlockNodeType){
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
    }
    return true
  }

  /** Show or hide placeHolders ('Contents...', 'Title...', etc.) depending on
  whether these elements are empty or not.*/
  calculatePlaceHolderCss (selectedElement) {
    var newPlaceHolderCss = '', i = 0,  that = this,
    placeHolders = [
      {'type': 'title', 'selector': '#document-title', 'placeHolder': gettext('Title...')},
      {'type': 'metadatasubtitle', 'selector': '#metadata-subtitle', 'placeHolder': gettext('Subtitle...')},
      {'type': 'metadaauthors', 'selector': '#metadata-authors', 'placeHolder': gettext('Authors...')},
      {'type': 'metadataabstract', 'selector': '#metadata-abstract', 'placeHolder': gettext('Abstract...')},
      {'type': 'metadatakeywords', 'selector': '#metadata-keywords', 'placeHolder': gettext('Keywords...')},
      {'type': 'documentcontents', 'selector': '#document-contents', 'placeHolder': gettext('Body...')}
    ]

    placeHolders.forEach(function(elementType, index){
        var partElement = that.pm.doc.child(i)
        if (partElement.type.name==!elementType.type) { return false }
        if (partElement.textContent.length === 0 &&
            (selectedElement != partElement || !that.pm.hasFocus())) {
            newPlaceHolderCss += elementType.selector + ':before {content: "' +
                elementType.placeHolder + '"}\n'
        }
        i++
    })
    if (that.placeHolderCss !== newPlaceHolderCss) {
        that.placeHolderCss = newPlaceHolderCss
        jQuery('#placeholder-styles')[0].innerHTML = newPlaceHolderCss
    }
  }
}
