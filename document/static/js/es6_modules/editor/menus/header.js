import {DocumentAccessRightsDialog} from "../../documents/access-rights/dialog"
import {documentStyleList} from "../../style/documentstyle-list"
import {citationDefinitions} from "../../style/citation-definitions"
import {addDropdownBox} from "../../common/common"

/* Bindings for the header menu */
export class ModMenusHeader {
    constructor(mod) {
        mod.header = this
        this.mod = mod
        this.bindEvents()
    }

    bindEvents() {
          let that = this


          //open dropdown for headermenu
          jQuery('.header-nav-item, .multibuttonsCover').each(function() {
              addDropdownBox(jQuery(this), jQuery(this).siblings(
                  '.fw-pulldown'))
          })

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

          jQuery('.metadata-menu-item, #open-close-header, .saverevision, .multibuttonsCover, \
          .savecopy, .download, .template-export, .latex, .epub, .html, .print, .style, .citationstyle, \
          .tools-item, .papersize, .metadata-menu-item, .share, .submit-ojs, #open-close-header, \
          .save, .papersize-menu, .metadata-menu, .documentstyle-menu, \
          .citationstyle-menu, .exporter-menu').addClass('disabled')

          jQuery('#editor-navigation').hide()

          jQuery(document).on('mousedown', '.savecopy:not(.disabled)', function() {
              that.mod.actions.saveCopy()
          })
          jQuery(document).on('mousedown', '.download:not(.disabled)', function() {
              that.mod.actions.download()
          })
          jQuery(document).on('mousedown', '.template-export:not(.disabled)', function() {
              let fileType = jQuery(this).attr('data-filetype')
              let templateUrl = jQuery(this).attr('data-template')
              that.mod.actions.downloadTemplateExport(templateUrl, fileType)
          })
          jQuery(document).on('mousedown', '.latex:not(.disabled)', function() {
              that.mod.actions.downloadLatex()
          })
          jQuery(document).on('mousedown', '.epub:not(.disabled)', function() {
              that.mod.actions.downloadEpub()
          })
          jQuery(document).on('mousedown', '.html:not(.disabled)', function() {
              that.mod.actions.downloadHtml()
          })
          jQuery(document).on('mousedown', '.print:not(.disabled)', function() {
              that.mod.actions.print()
          })
          jQuery(document).on('mousedown', '.close:not(.disabled)', function() {
              that.mod.actions.close()
          })

          jQuery(document).on('mousedown', '.submit-ojs:not(.disabled)', function() {
              that.mod.actions.submitOjs()
          })

          // Document Style switching
          jQuery(document).on('click', '.documentstyle-menu:not(.disabled)', function () {
              jQuery('span.docstyle.selected').removeClass('selected')
              let docStyle = that.mod.editor.pm.doc.firstChild.attrs.documentstyle
              jQuery(`span.docstyle[data-docstyle="${docStyle}"]`).addClass('selected')
          })
          jQuery(document).on('mousedown', "#header-navigation .docstyle:not(.disabled)", function() {
              let article = that.mod.editor.pm.doc.firstChild
              let attrs = _.clone(article.attrs)
              attrs.documentstyle = jQuery(this).attr('data-docstyle')
              that.mod.editor.pm.tr.setNodeType(0, false, attrs).apply()
              return false
          })

          // Citation Style switching
          jQuery(document).on('click', '.citationstyle-menu:not(.disabled)', function () {
              jQuery('span.citationstyle.selected').removeClass('selected')
              let citationstyle = that.mod.editor.pm.doc.firstChild.attrs.citationstyle
              jQuery(`span.citationstyle[data-citationstyle="${citationstyle}"]`).addClass('selected')
          })
          jQuery(document).on('mousedown', "#header-navigation .citationstyle:not(.disabled)", function() {
              let article = that.mod.editor.pm.doc.firstChild
              let attrs = _.clone(article.attrs)
              attrs.citationstyle = jQuery(this).attr('data-citationstyle')
              that.mod.editor.pm.tr.setNodeType(0, false, attrs).apply()

              return false
          })
          // Tools
          jQuery(document).on('mousedown', "#header-navigation .tools-item:not(.disabled)", function() {

              switch (jQuery(this).data('function')) {
                  case 'wordcounter':
                      that.mod.actions.wordCounter()
                      break
                  case 'showshortcuts':
                      that.mod.actions.showKeyBindings()
                      break
              }

              return false
          })

          // Paper size switching
          jQuery(document).on('click', '.papersize-menu:not(.disabled)', function () {
              jQuery('span.papersize.selected').removeClass('selected')
              let papersize = that.mod.editor.pm.doc.firstChild.attrs.papersize
              jQuery(`span.papersize[data-papersize="${papersize}"]`).addClass('selected')
          })
          jQuery(document).on('mousedown', "#header-navigation .papersize:not(.disabled)", function() {
              let article = that.mod.editor.pm.doc.firstChild
              let attrs = _.clone(article.attrs)
              attrs.papersize = jQuery(this).attr('data-papersize')
              that.mod.editor.pm.tr.setNodeType(0, false, attrs).apply()

              return false
          })

          jQuery(document).on('click', '.metadata-menu:not(.disabled)', function () {
              jQuery('span.metadata-menu-item.selected').removeClass('selected')
              that.mod.editor.pm.doc.firstChild.forEach(function(node){
                  if (node.type.isMetadata && !node.attrs.hidden) {
                      jQuery(`span.metadata-menu-item.metadata-${node.type.name}`).addClass('selected')
                  }
              })
          })

          /** Turn enabled metadata off and disabled metadata on.
              Function is bound to clicking option in metadata menu.
           */
          jQuery(document).on('click', '.metadata-menu-item:not(.disabled)', function () {
              let theMetadata = jQuery(this).attr('data-metadata')
              let offset, attrs
              that.mod.editor.pm.doc.firstChild.forEach(function(node, nodeOffset){
                  if (node.type.name===theMetadata) {
                      offset = nodeOffset + 1 // We need to add one as we are looking at offset values within the firstChild
                      attrs = _.clone(node.attrs)
                      attrs.hidden = (!attrs.hidden)
                  }
              })

              that.mod.editor.pm.tr.setNodeType(offset, false, attrs).apply()

          })

          jQuery(document).on('mousedown', '.share:not(.disabled)', function() {
              new DocumentAccessRightsDialog([
                  that.mod.editor.doc.id
              ], that.mod.editor.doc.access_rights, that.mod.editor.doc.owner.team_members, function(newAccessRights) {
                  that.mod.editor.doc.access_rights = newAccessRights
              }, function(memberData) {
                  that.mod.editor.user.team_members.push(memberData)
              })
          })

          //open and close header
          jQuery(document).on('click', '#open-close-header:not(.disabled)', function() {
              let headerTop = -92,
                  toolnavTop = 0,
                  contentTop = 108
              if (jQuery(this).hasClass('header-closed')) {
                  jQuery(this).removeClass('header-closed')
                  headerTop = 0
                  toolnavTop = 92
                  contentTop = 200
              } else {
                  jQuery(this).addClass('header-closed')
              }
              jQuery('#header').stop().animate({
                  'top': headerTop
              })
              jQuery('#editor-navigation').stop().animate({
                  'top': toolnavTop
              })
              jQuery('#pagination-layout').stop()
                  .animate({
                      'top': contentTop
                  }, {
                      'complete': function() {
                          that.mod.editor.mod.comments.layout.layoutComments()
                      }
                  })
          })

          jQuery(document).on('mousedown', '.saverevision:not(.disabled)', function() {
              that.mod.actions.saveRevision()
          })

    }

    enableExportMenu() {
        jQuery('.exporter-menu').each(function() {
            jQuery(this).removeClass('disabled')
        })
    }
}
