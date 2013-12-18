/*
 * QuestionMark.js
 * Fork from: http://impressivewebs.github.io/QuestionMark.js/ by Louis Lazaris
 *
 * This is an adaptation for Fidus Writer http://fiduswriter.org
 * by Gabriel Lopez <gabriel.marcos.lopez@gmail.com>
 * License: Creative Common 2.0
 * http://creativecommons.org/licenses/by/2.0/
 *
 * Usage: $().showShortcuts()
 */

/*      Each <ul> below creates a column, as long as each has a class of
             help-list. Each <li> is a single key/definition pair.
             The extra nested <span> is to help keep the definitions lined up
             vertically, for aesthetic reasons.
             If you hate the extra <span>, just remove it from each key/def pair.
        */

var tmp_shortcuts = _.template('\
<div title="'+gettext('Keyboard Shortcuts')+'">\
      <div id="helpListWrap" class="help-list-wrap">\
        <ul class="help-list">\
          <li class="help-key-unit">\
            <kbd class="help-key"><span>CTRL+p</span></kbd>\
            <span class="help-key-def">'+gettext('Print')+'</span>\
          </li>\
          <li class="help-key-unit">\
            <kbd class="help-key"><span>CTRL+s</span></kbd>\
            <span class="help-key-def">'+gettext('Save revision')+'</span>\
          </li>\
          <li class="help-key-unit">\
            <kbd class="help-key"><span>CTRL+?</span></kbd>\
            <span class="help-key-def">'+gettext('Show keyboard shortcuts')+'</span>\
          </li>\
        </ul><!-- .help-list -->\
        <ul class="help-list">\
          <li class="help-key-unit">\
            <kbd class="help-key"><span>CTRL+B</span></kbd>\
            <span class="help-key-def">'+gettext('Bold')+'</span>\
          </li>\
          <li class="help-key-unit">\
            <kbd class="help-key"><span>CTRL+I</span></kbd>\
            <span class="help-key-def">'+gettext('Italics')+'</span>\
          </li>\
          <li class="help-key-unit">\
            <kbd class="help-key"><span>CTRL+Z</span></kbd>\
            <span class="help-key-def">'+gettext('Undo')+'</span>\
          </li>\
          <li class="help-key-unit">\
            <kbd class="help-key"><span>CTRL+Shift+Z</span></kbd>\
            <span class="help-key-def">'+gettext('Redo')+'</span>\
          </li>\
        </ul><!-- .help-list -->\
      </div><!-- .help-list-wrap -->\
</div>\
');