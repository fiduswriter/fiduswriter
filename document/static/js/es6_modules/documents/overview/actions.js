import {getMissingDocumentListData} from "../tools"
import {importFidusTemplate, documentsListItemTemplate} from "./templates"
import {savecopy} from "../../exporter/native/copy"
import {EpubExporter} from "../../exporter/epub"
import {HTMLExporter} from "../../exporter/html"
import {LatexExporter} from "../../exporter/latex"
import {DocxExporter} from "../../exporter/docx"
import {OdtExporter} from "../../exporter/odt"
import {NativeExporter} from "../../exporter/native"
import {ImportFidusFile} from "../../importer/file"
import {DocumentRevisionsDialog} from "../revisions/dialog"
import {BibliographyDB} from "../../bibliography/database"
import {ImageDB} from "../../images/database"
import {activateWait, deactivateWait, addAlert, localizeDate, csrfToken} from "../../common/common"

export class DocumentOverviewActions {
    constructor (documentOverview) {
        documentOverview.mod.actions = this
        this.documentOverview = documentOverview
    }

    deleteDocument(id) {
        let that = this
        let postData = {id}

        jQuery.ajax({
            url: '/document/delete/',
            data: postData,
            type: 'POST',
            dataType: 'json',
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: function(xhr, settings) {
                xhr.setRequestHeader("X-CSRFToken", csrfToken)
            },
            success: function (data, textStatus, jqXHR) {
                that.documentOverview.stopDocumentTable()
                jQuery('#Text_' + id).detach()
                that.documentOverview.documentList = _.reject(that.documentOverview.documentList, function (
                    document) {
                    return document.id == id
                })
                that.documentOverview.startDocumentTable()
            }
        })
    }

    deleteDocumentDialog(ids) {
        let that = this
        jQuery('body').append('<div id="confirmdeletion" title="' + gettext(
                'Confirm deletion') +
            '"><p><span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 20px 0;"></span>' +
            gettext('Delete the document(s)?') + '</p></div>')
        let diaButtons = {}
        diaButtons[gettext('Delete')] = function () {
            for (let i = 0; i < ids.length; i++) {
                that.deleteDocument(ids[i])
            }
            jQuery(this).dialog("close")
            addAlert('success', gettext(
                'The document(s) have been deleted'))
        }

        diaButtons[gettext('Cancel')] = function () {
            jQuery(this).dialog("close")
        }

        jQuery("#confirmdeletion").dialog({
            resizable: false,
            height: 180,
            modal: true,
            close: function () {
                jQuery("#confirmdeletion").detach()
            },
            buttons: diaButtons,
            create: function () {
                let theDialog = jQuery(this).closest(".ui-dialog")
                theDialog.find(".ui-button:first-child").addClass(
                    "fw-button fw-dark")
                theDialog.find(".ui-button:last").addClass(
                    "fw-button fw-orange")
            }
        })
    }

    importFidus() {
        let that = this
        jQuery('body').append(importFidusTemplate())
        let diaButtons = {}
        diaButtons[gettext('Import')] = function () {
            let fidusFile = jQuery('#fidus-uploader')[0].files
            if (0 === fidusFile.length) {
                console.log('no file found')
                return false
            }
            fidusFile = fidusFile[0]
            if (104857600 < fidusFile.size) {
                //TODO: This is an arbitrary size. What should be done with huge import files?
                console.log('file too big')
                return false
            }
            activateWait()
            let reader = new window.FileReader()
            reader.onerror = function (e) {
                console.log('error', e.target.error.code)
            }

            that.documentOverview.getBibDB(function(){
                that.documentOverview.getImageDB(function(){
                    new ImportFidusFile(
                        fidusFile,
                        that.documentOverview.user,
                        true,
                        that.documentOverview.bibDB.db,
                        that.documentOverview.imageDB,
                        function(noErrors, returnValue) {
                            deactivateWait()
                            if (noErrors) {
                                let doc = returnValue[0]
                                //let aDocumentValues = returnValue.docInfo
                                addAlert('info', doc.title + gettext(
                                        ' successfully imported.'))
                                that.documentOverview.documentList.push(doc)
                                that.documentOverview.stopDocumentTable()
                                jQuery('#document-table tbody').append(
                                    documentsListItemTemplate({
                                            aDocument: doc,
                                            user: that.documentOverview.user,
                                            localizeDate
                                        }))
                                that.documentOverview.startDocumentTable()
                            } else {
                                addAlert('error', returnValue)
                            }
                        }
                    )
                })
            })

            //reader.onload = unzip
            //reader.readAsText(fidusFile)
            jQuery(this).dialog('close')
        }
        diaButtons[gettext('Cancel')] = function () {
            jQuery(this).dialog('close')
        }
        jQuery("#importfidus").dialog({
            resizable: false,
            height: 180,
            modal: true,
            buttons: diaButtons,
            create: function () {
                let theDialog = jQuery(this).closest(".ui-dialog")
                theDialog.find(".ui-button:first-child").addClass(
                    "fw-button fw-dark")
                theDialog.find(".ui-button:last").addClass(
                    "fw-button fw-orange")
                jQuery('#fidus-uploader').bind('change', function () {
                    jQuery('#import-fidus-name').html(jQuery(this).val()
                        .replace(
                            /C:\\fakepath\\/i, ''))
                })
                jQuery('#import-fidus-btn').bind('click', function (event) {
                    jQuery('#fidus-uploader').trigger('click')
                    event.preventDefault()
                })
            },
            close: function () {
                jQuery("#importfidus").dialog('destroy').remove()
            }
        })


    }

    copyFiles(ids) {
        let that = this
        getMissingDocumentListData(ids, that.documentOverview.documentList, function () {
            that.documentOverview.getBibDB(function(){
                that.documentOverview.getImageDB(function(){
                    for (let i = 0; i < ids.length; i++) {
                        let doc = _.findWhere(that.documentOverview.documentList, {
                            id: ids[i]
                        })
                        if (doc.owner.id===that.documentOverview.user.id) {
                            // We are copying from and to the same user.
                            savecopy(doc, that.documentOverview.bibDB.db, that.documentOverview.imageDB,
                            that.documentOverview.bibDB.db, that.documentOverview.imageDB,
                            that.documentOverview.user, function (doc, docInfo) {
                                that.documentOverview.documentList.push(doc)
                                that.documentOverview.stopDocumentTable()
                                jQuery('#document-table tbody').append(
                                    documentsListItemTemplate({
                                        aDocument: doc,
                                        user: that.documentOverview.user,
                                        localizeDate
                                    }))
                                that.documentOverview.startDocumentTable()
                            })
                        } else {
                            that.getBibDB(doc.owner.id, function(oldBibDB){
                                that.getImageDB(doc.owner.id, function(oldImageDB){
                                    /* We are copying from another user, so we are first loading
                                     the databases from that user
                                    */
                                    savecopy(doc, oldBibDB, oldImageDB,
                                    that.documentOverview.bibDB.db, that.documentOverview.imageDB,
                                    that.documentOverview.user, function (doc, docInfo) {
                                        that.documentOverview.documentList.push(doc)
                                        that.documentOverview.stopDocumentTable()
                                        jQuery('#document-table tbody').append(
                                            documentsListItemTemplate({
                                                aDocument: doc,
                                                user: that.documentOverview.user,
                                                localizeDate
                                            }))
                                        that.documentOverview.startDocumentTable()
                                    })
                                })
                            })
                        }

                    }
                })
            })

        })
    }

    getBibDB(userId, callback) {
        let bibGetter = new BibliographyDB(userId, true, false, false)
        bibGetter.getDB(function(){
            callback(bibGetter.db)
        })
    }

    getImageDB(userId, callback) {
        let imageGetter = new ImageDB(userId)
        imageGetter.getDB(function(){
            callback(imageGetter.db)
        })
    }

    downloadNativeFiles(ids) {
        let that = this
        getMissingDocumentListData(ids, that.documentOverview.documentList, function () {
            for (let i = 0; i < ids.length; i++) {
                new NativeExporter(_.findWhere(
                    that.documentOverview.documentList, {
                        id: ids[i]
                    }), false, false)
            }
        })
    }

    downloadHtmlFiles(ids) {
        let that = this
        getMissingDocumentListData(ids, that.documentOverview.documentList, function () {
            for (let i = 0; i < ids.length; i++) {
                new HTMLExporter(_.findWhere(
                    that.documentOverview.documentList, {
                        id: ids[i]
                    }), false)
            }
        })
    }

    downloadTemplateExportFiles(ids, templateUrl, templateType) {
        let that = this
        getMissingDocumentListData(ids, that.documentOverview.documentList, function () {
            for (let i = 0; i < ids.length; i++) {
                if (templateType==='docx') {
                    new DocxExporter(_.findWhere(
                        that.documentOverview.documentList, {
                            id: ids[i]
                        }), templateUrl, false, false)
                } else {
                    new OdtExporter(_.findWhere(
                        that.documentOverview.documentList, {
                            id: ids[i]
                        }), templateUrl, false, false)
                }

            }
        })
    }

    downloadLatexFiles(ids) {
        let that = this
        getMissingDocumentListData(ids, that.documentOverview.documentList, function () {
            for (let i = 0; i < ids.length; i++) {
                new LatexExporter(_.findWhere(
                    that.documentOverview.documentList, {
                        id: ids[i]
                    }), false)
            }
        })
    }

    downloadEpubFiles(ids) {
        let that = this
        getMissingDocumentListData(ids, that.documentOverview.documentList, function () {
            for (let i = 0; i < ids.length; i++) {
                new EpubExporter(_.findWhere(
                    that.documentOverview.documentList, {
                        id: ids[i]
                    }), false)
            }
        })
    }

    revisionsDialog(documentId) {
        let that = this
        that.documentOverview.getBibDB(function(){
            that.documentOverview.getImageDB(function(){
                new DocumentRevisionsDialog(
                  documentId,
                  that.documentOverview.documentList,
                  that.documentOverview.user,
                  that.documentOverview.bibDB,
                  that.documentOverview.imageDB,
                  function (actionObject) {
                    switch(actionObject.action) {
                        case 'added-document':
                            that.documentOverview.documentList.push(actionObject.doc)
                            that.documentOverview.stopDocumentTable()
                            jQuery('#document-table tbody').append(
                                documentsListItemTemplate({
                                    aDocument: actionObject.doc,
                                    user: that.documentOverview.user,
                                    localizeDate
                                }))
                            that.documentOverview.startDocumentTable()
                            break
                        case 'deleted-revision':
                            actionObject.doc.revisions = _.reject(actionObject.doc.revisions, function(revision) {
                                return (revision.pk == actionObject.id)
                            })
                            if (actionObject.doc.revisions.length === 0) {
                                jQuery('#Text_' + actionObject.doc.id + ' .revisions').detach()
                            }
                            break
                    }
                })
            })
        })
    }

}
