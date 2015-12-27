/* This file has been automatically generated. DO NOT EDIT IT.
Changes will be overwritten. Edit *.es6.js file and run ./es6-compiler.js */
"use strict";

(function () {
  var exports = this,

  /** Functions for ProseMirror integration.
  * @namespace proseMirrorConnector
  */
  proseMirrorConnector = {};

  proseMirrorConnector.makeEditor = function (where) {
    return new pm.ProseMirror({
      place: where
    });
  };

  //    menuBar: {float: true},
  proseMirrorConnector.fromDOM = pm.fromDOM;

  proseMirrorConnector.schema = pm.defaultSchema;

  exports.proseMirrorConnector = proseMirrorConnector;
}).call(undefined);

