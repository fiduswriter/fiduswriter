class Title extends pm.Textblock {}

Title.register("parseDOM", {
  tag: "div",
  parse: function(dom, state) {
    if (!dom.id === 'document-title') return false;
    state.wrapIn(dom, this)
  }
});

class MetaData extends pm.Block {}

MetaData.register("parseDOM", {
  tag: "div",
  parse: function(dom, state) {
    if (!dom.id === 'document-metadata') return false;
    state.wrapIn(dom, this)
  }
});

class MetaDataSubtitle extends pm.Textblock {}

MetaDataSubtitle.register("parseDOM", {
  tag: "div",
  parse: function(dom, state) {
    if (!dom.id === 'metadata-subtitle') return false;
    state.wrapIn(dom, this)
  }
});

class MetaDataAuthors extends pm.Textblock {}

MetaDataAuthors.register("parseDOM", {
  tag: "div",
  parse: function(dom, state) {
    if (!dom.id === 'metadata-authors') return false;
    state.wrapIn(dom, this)
  }
});

class MetaDataAbstract extends pm.Block {}

MetaDataAbstract.register("parseDOM", {
  tag: "div",
  parse: function(dom, state) {
    if (!dom.id === 'metadata-abstract') return false;
    state.wrapIn(dom, this)
  }
});

class MetaDataKeywords extends pm.Textblock {}

MetaDataKeywords.register("parseDOM", {
  tag: "div",
  parse: function(dom, state) {
    if (!dom.id === 'metadata-keywords') return false;
    state.wrapIn(dom, this)
  }
});

class DocumentContents extends pm.Block {}

DocumentContents.register("parseDOM", {
  tag: "div",
  parse: function(dom, state) {
    if (!dom.id === 'document-contents') return false;
    state.wrapIn(dom, this)
  }
});

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
