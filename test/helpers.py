testCaretJS = """//"; // without this, javascript linter doesn't work on code below 
(function () {
  /**
   * Helper functions for testing FidusWriter with Selenium.
   * @namespace testCaret
   */
      testCaret = {};


  /**
    * Caret represents the position of a collapsed range on the page.
    * @function makeCaret
    * @memberof testCaret
    * @param {jQuery Selector} parent Selector uniquely identifying the parent
    *                                 element which contains the caret.
    * @param {Integer} node Index of node within the parent element.
    * @param {Integer} offset Zero-based distance of caret from the beginning of
    *                         the containing node.
    */
  testCaret.makeCaret = function makeCaret(parent, node, offset) {
    return {
      parent: parent,
      node: node,
      offset: offset
    };
  };

  /**
   * Finds the node containing the given caret.
   * @function findCaretNode
   * @memberof testCaret
   * @param {Caret} caret Caret whose containing node is to be found.
   * @returns {jQuery Object}
   */
  testCaret.findCaretNode = function findCaretNode(caret) {
    return $(caret.parent).contents()[caret.node];
  };

  /**
   * Produces a caret referring to the starting position of the first range of
   * the given selection.
   * @function getCaret
   * @memberof testCaret
   * @param {Selection} selection Selection whose caret is to be gotten.
   * @returns {Caret}
   */
  testCaret.getCaret = function getCaret(selection) {
    var range = selection.getRangeAt(0);
    var parentElem = $(range.startContainer.parentElement);

    var parent = testCaret.getElementSelector(parentElem);
    var node = parentElem.contents().index(range.startContainer);
    var offset = range.startOffset;

    return testCaret.makeCaret(parent, node, offset);
  };

  /** 
   * Produces a jQuery selector string uniquely identifying the given element.
   * @function getElementSelector
   * @memberof testCaret
   * @param {jQuery Object} elem jQuery-wrapped element to which the selector will refer.
   * @returns {jQuery Selector}
   */
  testCaret.getElementSelector = function getElementSelector(elem) {
    var selector = '';
    var id = elem.prop('id');
    var parentElem, i;

    if (id) {
      selector = '#' + id;
    } else {
      parentElem = elem.parent();
      i = parentElem.children().index(elem);

      selector = (
        testCaret.getElementSelector(parentElem) +
        ' > ' +
        ':eq(' + i + ')'
      );
    }

    return selector;
  };

  /**
   * Sets the given selection to have a single collapsed range at the given
   * caret.
   * @function setCaret
   * @memberof testCaret
   * @param {Selection} selection Selection to be modified.
   * @param {Caret} caret Position to which the selection's range is to be set.
   * @returns {Selection}
   */
  testCaret.setCaret = function setCaret(selection, caret) {
    console.log(caret);
    var r = rangy.createRange();
    var toStart = true;

    r.collapse(toStart);
    r.setStart(
      testCaret.findCaretNode(caret),
      caret.offset
    );

    selection.removeAllRanges();
    selection.addRange(r);

    return selection;
  };

  /**
   * Compares if the given carets refer to the same node and offset.
   * @function caretsMatch
   * @memberof testCaret
   * @param {Caret} left Caret to be compared.
   * @param {Caret} right Caret to be compared.
   * @returns {Boolean}
   */
  testCaret.caretsMatch = function caretsMatch(left, right) {
    return (
      left.offset === right.offset &&
      (testCaret.findCaretNode(left) === testCaret.findCaretNode(right))
    );
  };


  return testCaret;
}());
"""#"