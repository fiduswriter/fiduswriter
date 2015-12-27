class Title extends pm.Textblock {}

Title.register("parseDOM", {
  tag: "div",
  parse: function(dom, state) {
    if (!dom.id === 'document-title') return false;
    state.wrapIn(dom, this)
  }
});

Title.prototype.serializeDOM = (node, serializer) => {
  let dom = serializer.elt("div", {
    id: 'document-title'
  })
  serializer.renderContent(node, dom);
  return dom;
}

class MetaData extends pm.Block {}

MetaData.register("parseDOM", {
  tag: "div",
  parse: function(dom, state) {
    if (!dom.id === 'document-metadata') return false;
    state.wrapIn(dom, this)
  }
});

MetaData.prototype.serializeDOM = (node, serializer) => {
  let dom = serializer.elt("div", {
    id: 'document-metadata'
  })
  serializer.renderContent(node, dom);
  return dom;
}

class MetaDataSubtitle extends pm.Textblock {}

MetaDataSubtitle.register("parseDOM", {
  tag: "div",
  parse: function(dom, state) {
    if (!dom.id === 'metadata-subtitle') return false;
    state.wrapIn(dom, this)
  }
});

MetaDataSubtitle.prototype.serializeDOM = (node, serializer) => {
  let dom = serializer.elt("div", {
    id: 'metadata-subtitle'
  })
  serializer.renderContent(node, dom);
  return dom;
}

class MetaDataAuthors extends pm.Textblock {}

MetaDataAuthors.register("parseDOM", {
  tag: "div",
  parse: function(dom, state) {
    if (!dom.id === 'metadata-authors') return false;
    state.wrapIn(dom, this)
  }
});

MetaDataAuthors.prototype.serializeDOM = (node, serializer) => {
  let dom = serializer.elt("div", {
    id: 'metadata-authors'
  })
  serializer.renderContent(node, dom);
  return dom;
}

class MetaDataAbstract extends pm.Block {}

MetaDataAbstract.register("parseDOM", {
  tag: "div",
  parse: function(dom, state) {
    if (!dom.id === 'metadata-abstract') return false;
    state.wrapIn(dom, this)
  }
});

MetaDataAbstract.prototype.serializeDOM = (node, serializer) => {
  let dom = serializer.elt("div", {
    id: 'metadata-abstract'
  })
  serializer.renderContent(node, dom);
  return dom;
}

class MetaDataKeywords extends pm.Textblock {}

MetaDataKeywords.register("parseDOM", {
  tag: "div",
  parse: function(dom, state) {
    if (!dom.id === 'metadata-keywords') return false;
    state.wrapIn(dom, this)
  }
});

MetaDataKeywords.prototype.serializeDOM = (node, serializer) => {
  let dom = serializer.elt("div", {
    id: 'metadata-keywords'
  })
  serializer.renderContent(node, dom);
  return dom;
}

class DocumentContents extends pm.Block {}

DocumentContents.register("parseDOM", {
  tag: "div",
  parse: function(dom, state) {
    if (!dom.id === 'document-contents') return false;
    state.wrapIn(dom, this)
  }
});

DocumentContents.prototype.serializeDOM = (node, serializer) => {
  let dom = serializer.elt("div", {
    id: 'document-contents'
  })
  serializer.renderContent(node, dom);
  return dom;
}

var fidusSchema = new pm.Schema(pm.defaultSchema.spec.update({
  title: Title,
  metadata: MetaData,
  metadatasubtitle: MetaDataSubtitle,
  metadataauthors: MetaDataAuthors,
  metadataabstract: MetaDataAbstract,
  metadatakeywords: MetaDataKeywords,
  documentcontents: DocumentContents
}));

window.fidusSchema = fidusSchema;
