import {getMissingDocumentListData} from "../tools"
import {importFidusTemplate, documentsListItemTemplate} from "./templates"
import {SaveCopy, ExportFidusFile} from "../../exporter/native"
import {EpubExporter} from "../../exporter/epub"
import {HTMLExporter} from "../../exporter/html"
import {LatexExporter} from "../../exporter/latex"
import {DocxExporter} from "../../exporter/docx"
import {OdtExporter} from "../../exporter/odt"
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
                this.documentOverview.documentList = this.documentOverview.documentList.filter(doc => doc.id !== id)
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
                        that.documentOverview.bibDB,
                        that.documentOverview.imageDB
                    )

                    importer.init().then(
                        ({doc, docInfo}) => {
                            deactivateWait()
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

                        },
                        errorMessage => {
                            addAlert('error', errorMessage)
                            deactivateWait()
                        }
                    )
            })


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
        getMissingDocumentListData(ids, this.documentOverview.documentList).then(
            () => this.documentOverview.getBibDB()
        ).then(
            () => this.documentOverview.getImageDB()
        ).then(
            () => {
                for (let i = 0; i < ids.length; i++) {
                    let doc = this.documentOverview.documentList.find(doc => doc.id === ids[i])
                    if (doc.owner.id===this.documentOverview.user.id) {
                        // We are copying from and to the same user.
                        let copier = new SaveCopy(
                            doc,
                            this.documentOverview.bibDB,
                            this.documentOverview.imageDB,
                            this.documentOverview.bibDB,
                            this.documentOverview.imageDB,
                            this.documentOverview.user
                        )

                        copier.init().then(
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
                                let copier = new SaveCopy(
                                    doc,
                                    oldBibDB,
                                    oldImageDB,
                                    this.documentOverview.bibDB,
                                    this.documentOverview.imageDB,
                                    this.documentOverview.user
                                )

                                copier.init().then(
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
            }
        )
    }

    getBibDB(userId) {
        let bibGetter = new BibliographyDB(userId, true)
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
            this.documentOverview.documentList
        ).then(
            () => {
                for (let i = 0; i < ids.length; i++) {
                    new ExportFidusFile(
                        this.documentOverview.documentList.find(doc => doc.id===ids[i]),
                        false, // no bibDB or imageDB present
                        false
                    )
                }
            }
        )
    }

    downloadHtmlFiles(ids) {
        getMissingDocumentListData(
            ids,
            this.documentOverview.documentList
        ).then(
            () => {
                for (let i = 0; i < ids.length; i++) {
                    new HTMLExporter(
                        this.documentOverview.documentList.find(doc => doc.id===ids[i]),
                        false,
                        this.documentOverview.citationStyles,
                        this.documentOverview.citationLocales
                    )
                }
            }
        )
    }

    downloadTemplateExportFiles(ids, templateUrl, templateType) {
        getMissingDocumentListData(
            ids,
            this.documentOverview.documentList
        ).then(
            () => {
                for (let i = 0; i < ids.length; i++) {
                    if (templateType==='docx') {
                        new DocxExporter(
                            this.documentOverview.documentList.find(doc => doc.id===ids[i]),
                            templateUrl,
                            false,
                            false,
                            this.documentOverview.citationStyles,
                            this.documentOverview.citationLocales
                        )
                    } else {
                        new OdtExporter(
                            this.documentOverview.documentList.find(doc => doc.id===ids[i]),
                            templateUrl,
                            false,
                            false,
                            this.documentOverview.citationStyles,
                            this.documentOverview.citationLocales
                        )
                    }

                }
            }
        )
    }

    downloadLatexFiles(ids) {
        getMissingDocumentListData(
            ids,
            this.documentOverview.documentList
        ).then(
            () => {
                for (let i = 0; i < ids.length; i++) {
                    new LatexExporter(
                        this.documentOverview.documentList.find(doc => doc.id===ids[i]),
                        false
                    )
                }
            }
        )
    }

    downloadEpubFiles(ids) {
        getMissingDocumentListData(
            ids,
            this.documentOverview.documentList
        ).then(
            () => {
                for (let i = 0; i < ids.length; i++) {
                  new EpubExporter(
                      this.documentOverview.documentList.find(doc => doc.id===ids[i]),
                      false,
                      this.documentOverview.citationStyles,
                      this.documentOverview.citationLocales
                  )
                }
            }
        )
    }

    revisionsDialog(documentId) {
        this.documentOverview.getBibDB().then(
            () => this.documentOverview.getImageDB()
        ).then(
            () => {
                let revDialog = new DocumentRevisionsDialog(
                    documentId,
                    this.documentOverview.documentList,
                    this.documentOverview.user,
                    this.documentOverview.bibDB,
                    this.documentOverview.imageDB
                )
                revDialog.init().then(
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
                            actionObject.doc.revisions = actionObject.doc.revisions.filter(rev => rev.pk !== actionObject.id)
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
