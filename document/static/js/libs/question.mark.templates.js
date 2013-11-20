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

var tmp_question_mark = _.template('\
<div id="helpUnderlay" class="help-underlay">\
  <div id="helpModal" class="help-modal">\
  <h1>'+gettext('Keyboard Shortcuts')+'</h1>\
    <div id="helpClose" class="help-close ui-button-icon-primary ui-icon ui-icon-closethick"></div><!-- .help-close -->\
    <div id="helpModalContent" class="help-modal-content">\
      <div id="helpListWrap" class="help-list-wrap">\
        <ul class="help-list">\
          <li class="help-key-unit">\
            <kbd class="help-key"><span>CTRL+p</span></kbd>\
            <span class="help-key-def">'+gettext('Print')+'</span>\
          </li>\
          <li class="help-key-unit">\
            <kbd class="help-key"><span>CTRL+s</span></kbd>\
            <span class="help-key-def">'+gettext('Save')+'</span>\
          </li>\
          <li class="help-key-unit">\
            <kbd class="help-key"><span>CTRL+?</span></kbd>\
            <span class="help-key-def">'+gettext('Keyboard Shortcuts')+'</span>\
          </li>\
        </ul><!-- .help-list -->\
        <ul class="help-list">\
          <li class="help-key-unit">\
            <kbd class="help-key"><span>p</span></kbd>\
            <span class="help-key-def">'+gettext('Print')+'</span>\
          </li>\
          <li class="help-key-unit">\
            <kbd class="help-key"><span>s</span></kbd>\
            <span class="help-key-def">'+gettext('Save')+'</span>\
          </li>\
          <li class="help-key-unit">\
            <kbd class="help-key"><span>?</span></kbd>\
            <span class="help-key-def">'+gettext('Keyboard Shortcuts')+'</span>\
          </li>\
        </ul><!-- .help-list -->\
        <ul class="help-list">\
          <li class="help-key-unit">\
            <kbd class="help-key"><span>p</span></kbd>\
            <span class="help-key-def">'+gettext('Print')+'</span>\
          </li>\
          <li class="help-key-unit">\
            <kbd class="help-key"><span>s</span></kbd>\
            <span class="help-key-def">'+gettext('Save')+'</span>\
          </li>\
          <li class="help-key-unit">\
            <kbd class="help-key"><span>?</span></kbd>\
            <span class="help-key-def">'+gettext('Keyboard Shortcuts')+'</span>\
          </li>\
        </ul><!-- .help-list -->\
        <ul class="help-list">\
          <li class="help-key-unit">\
            <kbd class="help-key"><span>p</span></kbd>\
            <span class="help-key-def">'+gettext('Print')+'</span>\
          </li>\
          <li class="help-key-unit">\
            <kbd class="help-key"><span>s</span></kbd>\
            <span class="help-key-def">'+gettext('Save')+'</span>\
          </li>\
          <li class="help-key-unit">\
            <kbd class="help-key"><span>?</span></kbd>\
            <span class="help-key-def">'+gettext('Keyboard Shortcuts')+'</span>\
          </li>\
        </ul><!-- .help-list -->\
      </div><!-- .help-list-wrap -->\
    </div><!-- .help-modal-content -->\
  </div><!-- .help-modal -->\
</div><!-- .help-underlay -->\
');