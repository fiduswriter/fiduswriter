(function () {
    var exports = this,
     /** Functions for ProseMirror integration.
     * @namespace proseMirrorConnector
     */
        proseMirrorConnector = {};

proseMirrorConnector.makeEditor = function (where) {
  return new pm.ProseMirror({
    place: where,
//    menuBar: {float: true},
  })
};

proseMirrorConnector.fromDOM = pm.fromDOM;

proseMirrorConnector.schema = pm.defaultSchema;

exports.proseMirrorConnector = proseMirrorConnector;

}).call(this);
