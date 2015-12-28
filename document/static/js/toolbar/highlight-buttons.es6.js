// Highlight buttons (adapted from ProseMirror's src/menu/update.js)

const MIN_FLUSH_DELAY = 200
const UPDATE_TIMEOUT = 200

export class HighlightToolbarButtons {
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
      this.markMenu()
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
      this.markMenu()
    }
  }

  markMenu() {
    /* Fidus Writer code */
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

    return true;
  }
}

window.HighlightToolbarButtons = HighlightToolbarButtons;
