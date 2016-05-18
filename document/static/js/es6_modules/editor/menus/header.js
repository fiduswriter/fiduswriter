import {DocumentAccessRightsDialog} from "../../documents/access-rights/dialog"

/* Bindings for the header menu */
export class ModMenusHeader {
    constructor(mod) {
        mod.header = this
        this.mod = mod
        this.bindEvents()
    }

    bindEvents() {
          let that = this
          let documentStyleMenu = document.getElementById("documentstyle-list"),
              citationStyleMenu = document.getElementById("citationstyle-list")

          // Enable toolbar menu
          jQuery('#menu1').ptMenu()

          //open dropdown for headermenu
          jQuery('.header-nav-item, .multibuttonsCover').each(function() {
              $.addDropdownBox(jQuery(this), jQuery(this).siblings(
                  '.fw-pulldown'))
          })

          for (let i = 0; i < documentStyleList.length; i++) {
              let newMenuItem = document.createElement("li")
              newMenuItem.innerHTML =
                "<span class='fw-pulldown-item style' data-style='"
                + documentStyleList[i].filename + "' title='"
                + documentStyleList[i].title + "'>"
                + documentStyleList[i].title + "</span>"

              documentStyleMenu.appendChild(newMenuItem)
          }
          for (let j in citeproc.styles) {
              let newMenuItem = document.createElement("li")
              newMenuItem.innerHTML =
                "<span class='fw-pulldown-item citationstyle' data-citationstyle='" + j
                + "' title='" + citeproc.styles[j].name + "'>"
                + citeproc.styles[j].name + "</span>"

              citationStyleMenu.appendChild(newMenuItem)
          }

          jQuery('.metadata-menu-item, #open-close-header, .saverevision, .multibuttonsCover, \
          .savecopy, .download, .latex, .epub, .html, .print, .style, .citationstyle, \
          .tools-item, .papersize, .metadata-menu-item, .share, #open-close-header, \
          .save, .papersize-menu, .metadata-menu, .documentstyle-menu, \
          .citationstyle-menu, .exporter-menu').addClass('disabled')

          jQuery('#editor-navigation').hide()

          jQuery(document).on('mousedown', '.savecopy:not(.disabled)', function() {
              that.mod.actions.saveCopy()
          })
          jQuery(document).on('mousedown', '.download:not(.disabled)', function() {
              that.mod.actions.download()
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

          // Document Style switching
          jQuery(document).on('mousedown', "#header-navigation .style:not(.disabled)", function() {
              if (that.mod.editor.mod.settings.set.setSetting('documentstyle',
                      jQuery(this).attr('data-style'), true)) {
                  that.mod.editor.docInfo.changed = true
              }
              return false
          })

          // Citation Style switching
          jQuery(document).on('mousedown', "#header-navigation .citationstyle:not(.disabled)", function() {
              if (that.mod.editor.mod.settings.set.setSetting('citationstyle',
                      jQuery(this).attr('data-citationstyle'), true)) {
                  that.mod.editor.docInfo.changed = true
                  that.mod.editor.mod.comments.layout.layoutComments()
              }
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
          jQuery(document).on('mousedown', "#header-navigation .papersize:not(.disabled)", function() {
              if (that.mod.editor.mod.settings.set.setSetting('papersize',
                      parseInt(jQuery(this).attr('data-paperheight')), true)) {
                  that.mod.editor.docInfo.changed = true
              }
              return false
          })
          /** Turn enabled metadata off and disabled metadata on, Function is bound to clicking option in metadata menu.
           */
          jQuery(document).on('mousedown', '.metadata-menu-item:not(.disabled)', function () {
              let theMetadata = jQuery(this).attr('data-metadata')

              that.mod.editor.mod.settings.set.setSetting('metadata-' + theMetadata,
                  !that.mod.editor.doc.settings['metadata-' +
                      theMetadata], true)
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
              let header_top = -92,
                  toolnav_top = 0,
                  content_top = 108
              if (jQuery(this).hasClass('header-closed')) {
                  jQuery(this).removeClass('header-closed')
                  header_top = 0,
                      toolnav_top = 92,
                      content_top = 200
              } else {
                  jQuery(this).addClass('header-closed')
              }
              jQuery('#header').stop().animate({
                  'top': header_top
              })
              jQuery('#editor-navigation').stop().animate({
                  'top': toolnav_top
              })
              jQuery('#pagination-layout').stop()
                  .animate({
                      'top': content_top
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
