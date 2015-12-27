/* Functions for ProseMirror integration.*/

var proseMirrorConnector = {};

proseMirrorConnector.makeEditor = function (where) {
  return new pm.ProseMirror({
    place: where,
    schema: fidusSchema
//    menuBar: {float: true},
  })
};

proseMirrorConnector.fromDOM = pm.fromDOM;
proseMirrorConnector.schema = fidusSchema;

window.proseMirrorConnector = proseMirrorConnector;
