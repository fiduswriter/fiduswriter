// Update UI (adapted from ProseMirror's src/menu/update.js)

const MIN_FLUSH_DELAY = 200
const UPDATE_TIMEOUT = 200

const BLOCK_LABELS = {
  'paragraph': 'Normal Text',
  'ordered_list': 'Numbered List',
  'bullet_list': 'Bulleted List',
  'blockquote': 'Block Quote',
  'heading_1': '1st Heading',
  'heading_2': '2nd Heading',
  'heading_3': '3rd Heading',
  'code_block': 'Code'
}

export class UpdateUI {
  constructor(pm, events) {
    this.pm = pm

    this.mustUpdate = false
    this.updateInfo = null
    this.timeout = null
    this.lastFlush = 0

    this.events = events.split(" ")
    this.onEvent = this.onEvent.bind(this)
    this.force = this.force.bind(this)
    this.events.forEach(event => pm.on(event, this.onEvent))
    pm.on("flushed", this.onFlushed = this.onFlushed.bind(this))
    this.updateUI()
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

    var documentTitle = theEditor.editor.doc.firstChild.textContent;
    //editorHelpers.setDisplay.title = function (theValue) {
        if (documentTitle.length === 0) {
            documentTitle = gettext('Untitled Document');
        }
        jQuery('title').html('Fidus Writer - ' + documentTitle);
        jQuery('#header h1').html(documentTitle);
    //};

    var marks = theEditor.editor.activeMarks();
    var strong = marks.some(function(mark){return (mark.type.name==='strong')});

    if (strong) {
        jQuery('#button-bold').addClass('ui-state-active');
    } else {
        jQuery('#button-bold').removeClass('ui-state-active');
    }

    var em = marks.some(function(mark){return (mark.type.name==='em')});

    if (em) {
        jQuery('#button-italic').addClass('ui-state-active');
    } else {
        jQuery('#button-italic').removeClass('ui-state-active');
    }

    var link = marks.some(function(mark){return (mark.type.name==='link')});

    if (link) {
        jQuery('#button-link').addClass('ui-state-active');
    } else {
        jQuery('#button-link').removeClass('ui-state-active');
    }

    /* Block level selector */
    var headElementType = theEditor.editor.doc.path([theEditor.editor.selection.head.path[0]]).type.name,
    anchorElementType = theEditor.editor.doc.path([theEditor.editor.selection.anchor.path[0]]).type.name;

    // For metadata, one has to look one level deeper.
    if (headElementType==='metadata') {
        headElementType = theEditor.editor.doc.path(theEditor.editor.selection.head.path.slice(0,2)).type.name;
    }

    if (anchorElementType==='metadata') {
        anchorElementType = theEditor.editor.doc.path(theEditor.editor.selection.anchor.path.slice(0,2)).type.name;
    }

    if (headElementType !== anchorElementType) {
        /* Selection goes across document parts */
        jQuery('.editortoolbar button').addClass('disabled');
        jQuery('#block-style-label').html('');

    } else {

        switch (headElementType) {
            case 'title':
                jQuery('.edit-button').addClass('disabled');
                jQuery('#block-style-label').html('Title');
                break;
            case 'metadatasubtitle':
                jQuery('.edit-button').addClass('disabled');
                jQuery('#block-style-label').html('Subtitle');
                break;
            case 'metadataauthors':
                jQuery('.edit-button').addClass('disabled');
                jQuery('#block-style-label').html('Authors');
                break;
            case 'metadatakeywords':
                jQuery('.edit-button').addClass('disabled');
                jQuery('#block-style-label').html('Keywords');
                break;
            case 'metadataabstract':
                jQuery('.edit-button').removeClass('disabled');
                jQuery('#button-figure').addClass('disabled');

                var headPath = theEditor.editor.selection.head.path,
                anchorPath = theEditor.editor.selection.anchor.path,
                blockNodeType = true, blockNode, nextBlockNodeType;

                if (headPath[2]===anchorPath[2]) {
                  // Selection within a single block.
                  blockNode = theEditor.editor.doc.path(theEditor.editor.selection.anchor.path.slice(0,3));
                  blockNodeType = blockNode.type.name === 'heading' ? blockNode.type.name + '_' + blockNode.attrs.level : blockNode.type.name;
                  jQuery('#block-style-label').html('Abstract: ' + BLOCK_LABELS[blockNodeType]);
                } else {
                    var iterator = theEditor.editor.doc.path(theEditor.editor.selection.head.path.slice(0,2)).iter(
                        _.min([headPath[2],anchorPath[2]]),
                        _.max([headPath[2],anchorPath[2]])+1
                    );

                    while(!iterator.atEnd() && blockNodeType) {
                        nextBlockNode = iterator.next();
                        nextBlockNodeType = blockNode.type.name === 'heading' ? blockNode.type.name + '_' + blockNode.attrs.level : blockNode.type.name;
                        if (blockNodeType===true) {
                            blockNodeType = nextBlockNodeType;
                        }
                        if (blockNodeType !== nextBlockNodeType) {
                            blockNodeType = false;
                        }
                    }


                    if (blockNodeType) {
                        jQuery('#block-style-label').html('Abstract: ' + BLOCK_LABELS[blockNodeType]);
                    } else {
                        jQuery('#block-style-label').html('Abstract');
                    }
                }

                break;
            case 'documentcontents':
                jQuery('.edit-button').removeClass('disabled');

                var headPath = theEditor.editor.selection.head.path,
                anchorPath = theEditor.editor.selection.anchor.path,
                blockNodeType = true, blockNode, nextBlockNodeType;

                if (headPath[1]===anchorPath[1]) {
                    // Selection within a single block.
                    blockNode = theEditor.editor.doc.path(theEditor.editor.selection.anchor.path.slice(0,2));
                    blockNodeType = blockNode.type.name === 'heading' ? blockNode.type.name + '_' + blockNode.attrs.level : blockNode.type.name;
                    jQuery('#block-style-label').html('Body: ' + BLOCK_LABELS[blockNodeType]);
                } else {
                    var iterator = theEditor.editor.doc.path(theEditor.editor.selection.head.path.slice(0,1)).iter(
                        _.min([headPath[1],anchorPath[1]]),
                        _.max([headPath[1],anchorPath[1]])+1
                    );

                    while(!iterator.atEnd() && blockNodeType) {
                        blockNode = iterator.next();
                        nextBlockNodeType = blockNode.type.name === 'heading' ? blockNode.type.name + '_' + blockNode.attrs.level : blockNode.type.name;
                        if (blockNodeType===true) {
                            blockNodeType = nextBlockNodeType;
                        }
                        if (blockNodeType !== nextBlockNodeType) {
                            blockNodeType = false;
                        }
                    }

                    if (blockNodeType) {
                        jQuery('#block-style-label').html('Body: ' + BLOCK_LABELS[blockNodeType]);
                    } else {
                        jQuery('#block-style-label').html('Body');
                    }
                }

                break;
        }
    }


    return true;
  }
}

window.UpdateUI = UpdateUI;
