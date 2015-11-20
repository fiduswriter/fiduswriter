(function () {
    var exports = this,
     /** Helper functions for ProseMirror integration.
     * @namespace proseMirrorHelpers
     */
        proseMirrorHelpers = {};

proseMirrorHelpers.makeEditor = function (where) {
  return new pm.ProseMirror({
    place: where,
//    menuBar: {float: true},
  })
};

exports.proseMirrorHelpers = proseMirrorHelpers;

}).call(this);
