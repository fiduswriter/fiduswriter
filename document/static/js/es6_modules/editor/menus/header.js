import {documentStyleList} from "../../style/documentstyle-list"
import {citationDefinitions} from "../../style/citation-definitions"

/* Bindings for the header menu */
export class ModMenusHeader {
    constructor(mod) {
        mod.header = this
        this.mod = mod
        this.bindEvents()
    }

    bindEvents() {

          let docStyleMenu = document.getElementById("documentstyle-list")
          documentStyleList.forEach(docStyle => {
              let newMenuItem = document.createElement("li")
              newMenuItem.innerHTML =
                "<span class='fw-pulldown-item docstyle' data-docstyle='" +
                docStyle.filename + "' title='" +
                docStyle.title + "'>" +
                docStyle.title + "</span>"

              docStyleMenu.appendChild(newMenuItem)
          })

          let citationStyleMenu = document.getElementById("citationstyle-list")
          Object.keys(citationDefinitions.styles).forEach(citDef => {
              let citDefName = citationDefinitions.styles[citDef].name
              let newMenuItem = document.createElement("li")
              newMenuItem.innerHTML =
                "<span class='fw-pulldown-item citationstyle' data-citationstyle='" +
                citDef + "' title='" + citDefName + "'>" +
                citDefName + "</span>"

              citationStyleMenu.appendChild(newMenuItem)
          })


          jQuery('#editor-navigation').hide()

          let that = this
          jQuery(document).on('mousedown', '.template-export:not(.disabled)', function() {
              let fileType = jQuery(this).attr('data-filetype')
              let templateUrl = jQuery(this).attr('data-template')
              that.mod.actions.downloadTemplateExport(templateUrl, fileType)
          })

          // Document Style switching
          jQuery(document).on('click', '.documentstyle-menu:not(.disabled)', () => {
              jQuery('span.docstyle.selected').removeClass('selected')
              let docStyle = this.mod.editor.view.state.doc.firstChild.attrs.documentstyle
              jQuery(`span.docstyle[data-docstyle="${docStyle}"]`).addClass('selected')
          })
          jQuery(document).on('mousedown', "#header-navigation .docstyle:not(.disabled)", function() {
              let article = that.mod.editor.view.state.doc.firstChild
              let attrs = _.clone(article.attrs)
              attrs.documentstyle = jQuery(this).attr('data-docstyle')
              that.mod.editor.view.dispatch(
                  that.mod.editor.view.state.tr.setNodeType(0, false, attrs)
              )
              return false
          })

          // Citation Style switching
          jQuery(document).on('click', '.citationstyle-menu:not(.disabled)', () => {
              jQuery('span.citationstyle.selected').removeClass('selected')
              let citationstyle = this.mod.editor.view.state.doc.firstChild.attrs.citationstyle
              jQuery(`span.citationstyle[data-citationstyle="${citationstyle}"]`).addClass('selected')
          })
          jQuery(document).on('mousedown', "#header-navigation .citationstyle:not(.disabled)", function() {
              let article = that.mod.editor.view.state.doc.firstChild
              let attrs = _.clone(article.attrs)
              attrs.citationstyle = jQuery(this).attr('data-citationstyle')
              that.mod.editor.view.dispatch(
                  that.mod.editor.view.state.tr.setNodeType(0, false, attrs)
              )

              return false
          })


    }
}
