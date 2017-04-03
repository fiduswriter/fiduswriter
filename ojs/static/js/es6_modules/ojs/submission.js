import {ZipFidus} from "../exporter/native/zip"
import {ShrinkFidus} from "../exporter/native/shrink"
import {createSlug} from "../exporter/tools/file"
import {addAlert, csrfToken} from "../common"

// Send an article submission to FW and OJS servers.

export class SendAuthorSubmission {
    constructor(doc, imageDB, bibDB, journalId, version, submissionId) {
        this.doc = doc
        this.imageDB = imageDB
        this.bibDB = bibDB
        this.journalId = journalId
        this.version = version
        this.submissionId = submissionId
    }

    init() {
        let shrinker = new ShrinkFidus(
            this.doc,
            this.imageDB,
            this.bibDB
        )

        shrinker.init().then(
            ({doc, shrunkImageDB, shrunkBibDB, httpIncludes}) => {
                let zipper = new ZipFidus(this.doc, shrunkImageDB, shrunkBibDB, httpIncludes)
                return zipper.init()
            }
        ).then(
            blob => this.uploadRevision(blob)
        )
    }

    uploadRevision(blob) {
        let data = new window.FormData()
        data.append('journal_id', this.journalId)
        data.append('doc_id', this.doc.id)
        data.append('title', this.doc.title)
        data.append('file', blob, createSlug(this.doc.title) + '.fidus')

        if (this.submissionId) {
            // The submission already has an id, so it must be a higher version
            // of an existing submission.
            data.append('submission_id', this.submissionId)
            data.append('version', this.version)
        }

        jQuery.ajax({
            url: '/proxy/ojs/authorSubmit',
            data: data,
            type: 'POST',
            cache: false,
            contentType: false,
            processData: false,
            crossDomain: false, // obviates need for sameOrigin test
            beforeSend: (xhr, settings) =>
                xhr.setRequestHeader("X-CSRFToken", csrfToken),
            success: () => addAlert('success', gettext('Article submitted')),
            error: () => addAlert('error', gettext('Article could not be submitted.'))
        })
    }

}
