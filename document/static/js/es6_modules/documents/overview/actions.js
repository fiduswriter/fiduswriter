import {getMissingDocumentListData} from "../tools"
import {importFidusTemplate, documentsListItemTemplate} from "./templates"
import {saveCopy} from "../../exporter/native/copy"
import {EpubExporter} from "../../exporter/epub"
import {HTMLExporter} from "../../exporter/html"
import {LatexExporter} from "../../exporter/latex"
import {DocxExporter} from "../../exporter/docx"
import {OdtExporter} from "../../exporter/odt"
import {NativeExporter} from "../../exporter/native"
import {ImportFidusFile} from "../../importer/file"
import {DocumentRevisionsDialog} from "../revisions"
import {BibliographyDB} from "../../bibliography/database"
import {ImageDB} from "../../images/database"
import {activateWait, deactivateWait, addAlert, localizeDate, csrfToken} from "../../common"

export class DocumentOverviewActions {
    constructor (documentOverview) {
        documentOverview.mod.actions = this
        this.documentOverview = documentOverview
    }

    deleteDocument(id) {
        let postData = {id}

        jQuery.ajax({
            url: '/document/delete/',
            data: postData,
            type: 'POST',
            dataType: 'json',
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: (xhr, settings) => {
                xhr.setRequestHeader("X-CSRFToken", csrfToken)
            },
            success: (data, textStatus, jqXHR) => {
                this.documentOverview.stopDocumentTable()
                jQuery('#Text_' + id).detach()
                this.documentOverview.documentList = _.reject(
                    this.documentOverview.documentList,
                    document => document.id === id
                )
                this.documentOverview.startDocumentTable()
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

            that.documentOverview.getBibDB().then(
                () => that.documentOverview.getImageDB()
            ).then(
                () => {
                    let importer = new ImportFidusFile(
                        fidusFile,
                        that.documentOverview.user,
                        true,
                        that.documentOverview.bibDB.db,
                        that.documentOverview.imageDB
                    )

                    importer.init().then(
                        ({doc, docInfo}) => {
                            deactivateWait()
                            //if (noErrors) {
                                //let doc = returnValue[0]
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
                            //} else {
                            //    addAlert('error', returnValue)
                            //}
                        },
                        errorMessage => {
                            addAlert('error', errorMessage)
                            deactivateWait()
                        }
                    )
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
            close: () => {
                jQuery("#importfidus").dialog('destroy').remove()
            }
        })


    }

    copyFiles(ids) {
        getMissingDocumentListData(ids, this.documentOverview.documentList, () => {
            this.documentOverview.getBibDB().then(
                () => this.documentOverview.getImageDB()
            ).then(() => {
                for (let i = 0; i < ids.length; i++) {
                    let doc = _.findWhere(this.documentOverview.documentList, {
                        id: ids[i]
                    })
                    if (doc.owner.id===this.documentOverview.user.id) {
                        // We are copying from and to the same user.
                        saveCopy(
                            doc,
                            this.documentOverview.bibDB.db,
                            this.documentOverview.imageDB,
                            this.documentOverview.bibDB.db,
                            this.documentOverview.imageDB,
                            this.documentOverview.user
                        ).then(
                            ({doc, docInfo}) => {
                                this.documentOverview.documentList.push(doc)
                                this.documentOverview.stopDocumentTable()
                                jQuery('#document-table tbody').append(
                                    documentsListItemTemplate({
                                        aDocument: doc,
                                        user: this.documentOverview.user,
                                        localizeDate
                                    }))
                                this.documentOverview.startDocumentTable()
                            }
                        )
                    } else {
                        this.getBibDB(doc.owner.id).then(oldBibDB => {
                            this.getImageDB(doc.owner.id).then(oldImageDB => {
                                /* We are copying from another user, so we are first loading
                                 the databases from that user
                                */
                                saveCopy(
                                    doc,
                                    oldBibDB,
                                    oldImageDB,
                                    this.documentOverview.bibDB.db,
                                    this.documentOverview.imageDB,
                                    this.documentOverview.user
                                ).then(
                                    ({doc, docInfo}) => {
                                        this.documentOverview.documentList.push(doc)
                                        this.documentOverview.stopDocumentTable()
                                        jQuery('#document-table tbody').append(
                                            documentsListItemTemplate({
                                                aDocument: doc,
                                                user: this.documentOverview.user,
                                                localizeDate
                                            }))
                                        this.documentOverview.startDocumentTable()
                                    }
                                )
                            })
                        })
                    }
                }
            })
        })
    }

    getBibDB(userId) {
        let bibGetter = new BibliographyDB(userId, true, false, false)
        return new Promise (resolve => {
            bibGetter.getDB().then(() => resolve(bibGetter.db))
        })

    }

    getImageDB(userId) {
        let imageGetter = new ImageDB(userId)
        return new Promise (resolve => {
            imageGetter.getDB().then(() => resolve(imageGetter.db))
        })
    }

    downloadNativeFiles(ids) {
        getMissingDocumentListData(
            ids,
            this.documentOverview.documentList,
            () => {
                for (let i = 0; i < ids.length; i++) {
                    new NativeExporter(_.findWhere(
                        this.documentOverview.documentList, {
                            id: ids[i]
                        }), false, false)
                }
            }
        )
    }

    downloadHtmlFiles(ids) {
        getMissingDocumentListData(
            ids,
            this.documentOverview.documentList,
            () => {
                for (let i = 0; i < ids.length; i++) {
                    new HTMLExporter(_.findWhere(
                        this.documentOverview.documentList, {
                            id: ids[i]
                        }), false)
                }
            }
        )
    }

    downloadTemplateExportFiles(ids, templateUrl, templateType) {
        getMissingDocumentListData(
            ids,
            this.documentOverview.documentList,
            () => {
                for (let i = 0; i < ids.length; i++) {
                    if (templateType==='docx') {
                        new DocxExporter(_.findWhere(
                            this.documentOverview.documentList, {
                                id: ids[i]
                            }), templateUrl, false, false)
                    } else {
                        new OdtExporter(_.findWhere(
                            this.documentOverview.documentList, {
                                id: ids[i]
                            }), templateUrl, false, false)
                    }

                }
            }
        )
    }

    downloadLatexFiles(ids) {
        getMissingDocumentListData(
            ids,
            this.documentOverview.documentList,
            () => {
                for (let i = 0; i < ids.length; i++) {
                    new LatexExporter(_.findWhere(
                        this.documentOverview.documentList, {
                            id: ids[i]
                        }), false)
                }
            }
        )
    }

    downloadEpubFiles(ids) {
        getMissingDocumentListData(
            ids,
            this.documentOverview.documentList,
            () => {
                for (let i = 0; i < ids.length; i++) {
                    new EpubExporter(_.findWhere(
                        this.documentOverview.documentList, {
                            id: ids[i]
                        }), false)
                }
            }
        )
    }

    revisionsDialog(documentId) {
        this.documentOverview.getBibDB().then(
            () => this.documentOverview.getImageDB()
        ).then(
            () => {
                new DocumentRevisionsDialog(
                  documentId,
                  this.documentOverview.documentList,
                  this.documentOverview.user,
                  this.documentOverview.bibDB,
                  this.documentOverview.imageDB,
                  actionObject => {
                    switch(actionObject.action) {
                        case 'added-document':
                            this.documentOverview.documentList.push(actionObject.doc)
                            this.documentOverview.stopDocumentTable()
                            jQuery('#document-table tbody').append(
                                documentsListItemTemplate({
                                    aDocument: actionObject.doc,
                                    user: this.documentOverview.user,
                                    localizeDate
                                }))
                            this.documentOverview.startDocumentTable()
                            break
                        case 'deleted-revision':
                            actionObject.doc.revisions = _.reject(
                                actionObject.doc.revisions,
                                revision => revision.pk === actionObject.id
                            )
                            if (actionObject.doc.revisions.length === 0) {
                                jQuery('#Text_' + actionObject.doc.id + ' .revisions').detach()
                            }
                            break
                    }
                })
            }
        )
    }
}
