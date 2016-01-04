import {Schema, defaultSchema, Block, Textblock, Inline, Attribute, MarkType} from "prosemirror/dist/model"

class Title extends Textblock {}

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

class MetaData extends Block {}

MetaData.register("parseDOM", {
  tag: "div",
  parse: function(dom, state) {
    if (dom.id !== 'document-metadata') return false;
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

class MetaDataSubtitle extends Textblock {}

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

class MetaDataAuthors extends Textblock {}

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

class MetaDataAbstract extends Block {}

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

class MetaDataKeywords extends Textblock {}

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

class DocumentContents extends Block {}

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

class Footnote extends Inline {}

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

class Citation extends Inline {}

Citation.register("parseDOM", {
  tag: "span",
  parse: function(dom, state) {
    if (!dom.classList.contains('citation')) return false;
    state.insertFrom(dom, this, {
        bibFormat: dom.getAttribute('data-bib-format'),
        bibEntry: dom.getAttribute('data-bib-entry'),
        bibBefore: dom.getAttribute('data-bib-before'),
        bibPage: dom.getAttribute('data-bib-page')
    });
  }
});

Citation.prototype.serializeDOM = (node, serializer) => {
  let dom = serializer.elt("span", {
    class: 'citation',
    dataBibFormat: node.attrs.bibFormat,
    dataBibEntry: node.attrs.bibEntry,
    dataBibBefore: node.attrs.bibBefore,
    dataBibPage: node.attrs.bibPage
  })
  return dom;
}

class Equation extends Inline {}

Equation.register("parseDOM", {
  tag: "span",
  parse: function(dom, state) {
    if (!dom.classList.contains('equation')) return false;
    state.insertFrom(dom, this, {
        equation: dom.getAttribute('data-equation')
    });
  }
});

Equation.prototype.serializeDOM = (node, serializer) => {
  let dom = serializer.elt("span", {
    class: 'equation',
    dataEquation: node.attrs.equation
  })
  return dom;
}

class Figure extends Block {}

Figure.register("parseDOM", {
  tag: "figure",
  parse: function(dom, state) {
    state.insertFrom(dom, this, {
        equation: dom.getAttribute('data-equation'),
        image: dom.getAttribute('data-image'),
        figureCategory: dom.getAttribute('data-figure-category'),
        caption: dom.getAttribute('data-caption'),
    });
  }
});

Figure.prototype.serializeDOM = (node, serializer) => {
  let dom = serializer.elt("figure", {
    dataEquation: node.attrs.equation,
    dataImage: node.attrs.image,
    dataFigureCategory: node.attrs.figureCategory,
    dataCaption: node.attrs.caption
  })
  if (node.attrs.image.length > 0) {
      dom.appendChild(serializer.elt("div"));
      dom.firstChild.appendChild(serializer.elt("img", {
          "src": ImageDB[node.attrs.image].image
      }))
  } else {
      dom.appendChild(serializer.elt("div", {
          class: 'figure-equation',
          dataEquation: node.attrs.equation
      }));
  }
  let captionNode = serializer.elt("figcaption");
  if (node.attrs.figureCategory !== 'none') {
      let figureCatNode = serializer.elt("span", {
          class: 'figure-cat-' + node.attrs.figureCategory,
          dataFigureCategory: node.attrs.figureCategory
      });
      figureCatNode.innerHTML = node.attrs.figureCategory;
      captionNode.appendChild(figureCatNode);
  }
  if (node.attrs.figureCaption !== '') {
      let captionTextNode = serializer.elt("span", {
          dataCaption: node.attrs.figureCaption
      });
      captionTextNode.innerHTML = node.attrs.figureCaption;

      captionNode.appendChild(captionTextNode);
  }
  dom.appendChild(captionNode);
  return dom;
}

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

class CommentMark extends MarkType {
  static get rank() { return 54 }
}

CommentMark.attributes = {
  id: new Attribute,
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

CommentMark.register("command", {
  name: "set",
  label: "Add Comment",
  run(pm, id) { pm.setMark(this, true, {id}) },
  params: [
    {label: "ID", type: "text"},
  ],
  select(pm) { return markApplies(pm, this) && !markActive(pm, this) },
})

CommentMark.register("command", {
  name: "unset",
  derive: true,
  label: "Remove comment",
  menuGroup: "inline(30)",
  active() { return true }
})

export var fidusSchema = new Schema(defaultSchema.spec.update({
  title: Title,
  metadata: MetaData,
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

window.fidusSchema = fidusSchema;
