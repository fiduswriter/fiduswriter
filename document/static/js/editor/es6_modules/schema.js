import {Schema, defaultSchema, Block, Textblock, Inline, Attribute, MarkType} from "prosemirror/dist/model"


class Title extends Textblock {
  get locked() { return true }
  get selectable() { return false }
}

Title.register("parseDOM", {
  tag: "div",
  parse: function(dom, state) {
    if (dom.id !== 'document-title') return false;
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

class MetaDataSubtitle extends Textblock {
  get locked() { return true }
  get selectable() { return false }
}

MetaDataSubtitle.register("parseDOM", {
  tag: "div",
  parse: function(dom, state) {
    if (dom.id !== 'metadata-subtitle') return false;
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

class MetaDataAuthors extends Textblock {
  get locked() { return true }
  get selectable() { return false }
}

MetaDataAuthors.register("parseDOM", {
  tag: "div",
  parse: function(dom, state) {
    if (dom.id !== 'metadata-authors') return false;
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

class MetaDataAbstract extends Block {
  get locked() { return true }
  get selectable() { return false }
}

MetaDataAbstract.register("parseDOM", {
  tag: "div",
  parse: function(dom, state) {
    if (dom.id !== 'metadata-abstract') return false;
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

class MetaDataKeywords extends Textblock {
  get locked() { return true }
  get selectable() { return false }
}

MetaDataKeywords.register("parseDOM", {
  tag: "div",
  parse: function(dom, state) {
    if (dom.id !== 'metadata-keywords') return false;
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

class DocumentContents extends Block {
  get locked() { return true }
  get selectable() { return false }
}

DocumentContents.register("parseDOM", {
  tag: "div",
  parse: function(dom, state) {
    if (dom.id !== 'document-contents') return false;
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

class Footnote extends Inline {
  get contains() { return "inline" }
}

Footnote.register("parseDOM", {
  tag: "span",
  parse: function(dom, state) {
    if (!dom.classList.contains('footnote')) return false;
    state.wrapIn(dom, this); // Doesn't currently work, see https://github.com/ProseMirror/prosemirror/issues/109
  }
});

Footnote.register("parseDOM", {
  tag: "span",
  parse: function(dom, state) {
    if (!dom.classList.contains('pagination-footnote')) return false;
    state.wrapIn(dom.firstChild.firstChild, this);
  }
});

Footnote.prototype.serializeDOM = (node, serializer) => {
  let dom = serializer.elt("span", {
    class: 'pagination-footnote'
  })
  dom.appendChild(serializer.elt("span"));
  dom.firstChild.appendChild(serializer.elt("span"));
  serializer.renderContent(node, dom.firstChild.firstChild);
  return dom;
}

const footnoteIcon = {
  type: "icon", // TODO: use real footnote icon
  width: 951, height: 1024,
  path: "M832 694q0-22-16-38l-118-118q-16-16-38-16-24 0-41 18 1 1 10 10t12 12 8 10 7 14 2 15q0 22-16 38t-38 16q-8 0-15-2t-14-7-10-8-12-12-10-10q-18 17-18 41 0 22 16 38l117 118q15 15 38 15 22 0 38-14l84-83q16-16 16-38zM430 292q0-22-16-38l-117-118q-16-16-38-16-22 0-38 15l-84 83q-16 16-16 38 0 22 16 38l118 118q15 15 38 15 24 0 41-17-1-1-10-10t-12-12-8-10-7-14-2-15q0-22 16-38t38-16q8 0 15 2t14 7 10 8 12 12 10 10q18-17 18-41zM941 694q0 68-48 116l-84 83q-47 47-116 47-69 0-116-48l-117-118q-47-47-47-116 0-70 50-119l-50-50q-49 50-118 50-68 0-116-48l-118-118q-48-48-48-116t48-116l84-83q47-47 116-47 69 0 116 48l117 118q47 47 47 116 0 70-50 119l50 50q49-50 118-50 68 0 116 48l118 118q48 48 48 116z"
}


Footnote.register("command", {
  name: "insert",
  label: "Insert footnote",
  derive: {
    params: []
  },
  menuGroup: "inline(34)",
  display: footnoteIcon
})


class Citation extends Inline {
  get attrs() {
    return {
      bibFormat: new Attribute({default: ""}),
      bibEntry: new Attribute,
      bibBefore: new Attribute({default: ""}),
      bibPage: new Attribute({default: ""})
    }
  }
}

Citation.register("parseDOM", {
  tag: "span",
  parse: function(dom, state) {
    if (!dom.classList.contains('citation')) return false;
    state.insert(this, {
        bibFormat: dom.getAttribute('data-bib-format') || '',
        bibEntry: dom.getAttribute('data-bib-entry') || '',
        bibBefore: dom.getAttribute('data-bib-before') || '',
        bibPage: dom.getAttribute('data-bib-page') || ''
    });
  }
});

Citation.register("parseDOM", {
  tag: "cite",
  parse: function(dom, state) {
    state.insert(this, {
        bibFormat: dom.getAttribute('data-bib-format') || '',
        bibEntry: dom.getAttribute('data-bib-entry') || '',
        bibBefore: dom.getAttribute('data-bib-before') || '',
        bibPage: dom.getAttribute('data-bib-page') || ''
    });
  }
});


Citation.prototype.serializeDOM = (node, serializer) => {
  let dom = serializer.elt("span", {
    class: 'citation',
    'data-bib-format': node.attrs.bibFormat,
    'data-bib-entry': node.attrs.bibEntry,
    'data-bib-before': node.attrs.bibBefore,
    'data-bib-page': node.attrs.bibPage
  })
  return dom
}

const citationIcon = {
  type: "icon", // TODO: use real citation icon
  width: 951, height: 1024,
  path: "M832 694q0-22-16-38l-118-118q-16-16-38-16-24 0-41 18 1 1 10 10t12 12 8 10 7 14 2 15q0 22-16 38t-38 16q-8 0-15-2t-14-7-10-8-12-12-10-10q-18 17-18 41 0 22 16 38l117 118q15 15 38 15 22 0 38-14l84-83q16-16 16-38zM430 292q0-22-16-38l-117-118q-16-16-38-16-22 0-38 15l-84 83q-16 16-16 38 0 22 16 38l118 118q15 15 38 15 24 0 41-17-1-1-10-10t-12-12-8-10-7-14-2-15q0-22 16-38t38-16q8 0 15 2t14 7 10 8 12 12 10 10q18-17 18-41zM941 694q0 68-48 116l-84 83q-47 47-116 47-69 0-116-48l-117-118q-47-47-47-116 0-70 50-119l-50-50q-49 50-118 50-68 0-116-48l-118-118q-48-48-48-116t48-116l84-83q47-47 116-47 69 0 116 48l117 118q47 47 47 116 0 70-50 119l50 50q49-50 118-50 68 0 116 48l118 118q48 48 48 116z"
}

Citation.register("command", {
  name: "insert",
  label: "Insert citation",
  derive: {
    params: [
      {label: "Bibliography Format", type: "text", attr: "bibFormat"},
      {label: "Bibliography Entry", type: "text", attr: "bibEntry"},
      {label: "Text Before", type: "text", attr: "bibBefore"},
      {label: "Page number", type: "text", attr: "bibPage"}
    ]
  },
  menuGroup: "inline(42)",
  display: citationIcon
})

class Equation extends Inline {
  get attrs() {
    return {
      equation: new Attribute({default: ""})
    }
  }
}


Equation.register("parseDOM", {
  tag: "span",
  parse: function(dom, state) {
    if (!dom.classList.contains('equation')) return false;
    state.insert(this, {
        equation: dom.getAttribute('data-equation')
    });
  }
});

Equation.prototype.serializeDOM = (node, serializer) => {
  let dom = serializer.elt("span", {
    class: 'equation',
    'data-equation': node.attrs.equation
  })
  return dom;
}

const equationIcon = {
  type: "icon", // TODO: use real equation icon
  width: 951, height: 1024,
  path: "M832 694q0-22-16-38l-118-118q-16-16-38-16-24 0-41 18 1 1 10 10t12 12 8 10 7 14 2 15q0 22-16 38t-38 16q-8 0-15-2t-14-7-10-8-12-12-10-10q-18 17-18 41 0 22 16 38l117 118q15 15 38 15 22 0 38-14l84-83q16-16 16-38zM430 292q0-22-16-38l-117-118q-16-16-38-16-22 0-38 15l-84 83q-16 16-16 38 0 22 16 38l118 118q15 15 38 15 24 0 41-17-1-1-10-10t-12-12-8-10-7-14-2-15q0-22 16-38t38-16q8 0 15 2t14 7 10 8 12 12 10 10q18-17 18-41zM941 694q0 68-48 116l-84 83q-47 47-116 47-69 0-116-48l-117-118q-47-47-47-116 0-70 50-119l-50-50q-49 50-118 50-68 0-116-48l-118-118q-48-48-48-116t48-116l84-83q47-47 116-47 69 0 116 48l117 118q47 47 47 116 0 70-50 119l50 50q49-50 118-50 68 0 116 48l118 118q48 48 48 116z"
}

Equation.register("command", {
  name: "insert",
  label: "Insert equation",
  derive: {
    params: [
      {label: "Equation", type: "text", attr: "equation"},
    ],
  },
  menuGroup: "inline(33)",
  display: equationIcon
})


class Figure extends Block {
  get attrs() {
    return {
      equation: new Attribute({default: ""}),
      image: new Attribute({default: ""}),
      figureCategory: new Attribute({default: ""}),
      caption: new Attribute({default: ""})
    }
  }
  get contains() {
    return null
  }
}

Figure.register("parseDOM", {
  tag: "figure",
  parse: function(dom, state) {
    state.insert(this, {
        equation: dom.getAttribute('data-equation'),
        image: dom.getAttribute('data-image'),
        figureCategory: dom.getAttribute('data-figure-category'),
        caption: dom.getAttribute('data-caption'),
    });
  }
});

Figure.prototype.serializeDOM = (node, serializer) => {
  let dom = serializer.elt("figure", {
    'data-equation': node.attrs.equation,
    'data-image': node.attrs.image,
    'data-figure-category': node.attrs.figureCategory,
    'data-caption': node.attrs.caption
  })
  if (node.attrs.image) {
      dom.appendChild(serializer.elt("div"));
      dom.firstChild.appendChild(serializer.elt("img", {
          "src": ImageDB[node.attrs.image].image
      }))
  } else {
      dom.appendChild(serializer.elt("div", {
          class: 'figure-equation',
          'data-equation': node.attrs.equation
      }));
  }
  let captionNode = serializer.elt("figcaption");
  if (node.attrs.figureCategory !== 'none') {
      let figureCatNode = serializer.elt("span", {
          class: 'figure-cat-' + node.attrs.figureCategory,
          'data-figure-category': node.attrs.figureCategory
      });
      figureCatNode.innerHTML = node.attrs.figureCategory;
      captionNode.appendChild(figureCatNode);
  }
  if (node.attrs.caption !== '') {
      let captionTextNode = serializer.elt("span", {
          'data-caption': node.attrs.caption
      });
      captionTextNode.innerHTML = node.attrs.caption;

      captionNode.appendChild(captionTextNode);
  }
  dom.appendChild(captionNode);
  return dom;
}

const figureIcon = {
    type: "icon", // TODO: Use real figure icon
    width: 1097, height: 1024,
    path: "M365 329q0 45-32 77t-77 32-77-32-32-77 32-77 77-32 77 32 32 77zM950 548v256h-804v-109l182-182 91 91 292-292zM1005 146h-914q-7 0-12 5t-5 12v694q0 7 5 12t12 5h914q7 0 12-5t5-12v-694q0-7-5-12t-12-5zM1097 164v694q0 37-26 64t-64 26h-914q-37 0-64-26t-26-64v-694q0-37 26-64t64-26h914q37 0 64 26t26 64z"
  }


Figure.register("command", {
  name: "insert",
  label: "Insert figure",
  derive: {
    params: [
      {label: "Equation", type: "text", attr: "equation"},
      {label: "Image PK", type: "text", attr: "image"},
      {label: "Category", type: "text", attr: "figureCategory"},
      {label: "Caption", type: "text", attr: "caption"}
    ]
  },
  menuGroup: "inline(32)",
  display: figureIcon
})

/* From prosemirror/src/edit/commands.js */

function markApplies(pm, type) {
  let {from, to} = pm.selection
  let relevant = false
  pm.doc.nodesBetween(from, to, node => {
    if (node.isTextblock) {
      if (node.type.canContainMark(type)) relevant = true
      return false
    }
  })
  return relevant
}

function markActive(pm, type) {
  let sel = pm.selection
  if (sel.empty)
    return type.isInSet(pm.activeMarks())
  else
    return pm.doc.rangeHasMark(sel.from, sel.to, type)
}

export class CommentMark extends MarkType {
  get attrs() {
    return {
      id: new Attribute
    }
  }
  static get rank() { return 54 }
}


CommentMark.register("parseDOM", {tag: "span", parse: function(dom, state) {
  if (!dom.classList.contains('comment')) return false;
  let id = dom.getAttribute("data-id")
  if (!id) return false
  state.wrapMark(dom, this.create({id}))
}})

CommentMark.prototype.serializeDOM = (mark, serializer) => {
  return serializer.elt("span", {class: 'comment', 'data-id': mark.attrs.id})
}

const commentIcon = {
  type: "icon", // TODO: use real comment icon
  width: 951, height: 1024,
  path: "M832 694q0-22-16-38l-118-118q-16-16-38-16-24 0-41 18 1 1 10 10t12 12 8 10 7 14 2 15q0 22-16 38t-38 16q-8 0-15-2t-14-7-10-8-12-12-10-10q-18 17-18 41 0 22 16 38l117 118q15 15 38 15 22 0 38-14l84-83q16-16 16-38zM430 292q0-22-16-38l-117-118q-16-16-38-16-22 0-38 15l-84 83q-16 16-16 38 0 22 16 38l118 118q15 15 38 15 24 0 41-17-1-1-10-10t-12-12-8-10-7-14-2-15q0-22 16-38t38-16q8 0 15 2t14 7 10 8 12 12 10 10q18-17 18-41zM941 694q0 68-48 116l-84 83q-47 47-116 47-69 0-116-48l-117-118q-47-47-47-116 0-70 50-119l-50-50q-49 50-118 50-68 0-116-48l-118-118q-48-48-48-116t48-116l84-83q47-47 116-47 69 0 116 48l117 118q47 47 47 116 0 70-50 119l50 50q49-50 118-50 68 0 116 48l118 118q48 48 48 116z"
}

CommentMark.register("command", {
  name: "set",
  label: "Add Comment",
  derive: {
    inverseSelect: true,
    params: [
      {label: "ID", type: "text", attr: "id"}
    ]
  },
  menuGroup: "inline(35)",
  display: commentIcon
})

CommentMark.register("command", {
  name: "unset",
  derive: true,
  label: "Remove comment",
  menuGroup: "inline(35)",
  active() { return true },
  display: commentIcon
})

export var fidusSchema = new Schema(defaultSchema.spec.update({
  title: Title,
  metadatasubtitle: MetaDataSubtitle,
  metadataauthors: MetaDataAuthors,
  metadataabstract: MetaDataAbstract,
  metadatakeywords: MetaDataKeywords,
  documentcontents: DocumentContents,
  footnote: Footnote,
  citation: Citation,
  equation: Equation,
  figure: Figure
}, {
  comment: CommentMark
}));
