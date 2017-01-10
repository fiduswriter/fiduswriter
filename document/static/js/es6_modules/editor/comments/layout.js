import {commentsTemplate, filterByUserBoxTemplate} from "./templates"
import {Comment} from "./comment"
import {localizeDate} from "../../common/common"

/* Functions related to layouting of comments */
export class ModCommentLayout {
    constructor(mod) {
        mod.layout = this
        this.mod = mod
        this.activeCommentId = false
        this.activeCommentAnswerId = false
        this.setup()
        this.bindEvents()
    }

    setup() {
        // Add two elements to hold dynamic CSS info about comments.
        let styleContainers = document.createElement('temp')
        styleContainers.innerHTML = `
        <style type="text/css" id="active-comment-style"></style>
        <style type="text/css" id="comment-placement-style"></style>`
        while (styleContainers.firstElementChild) {
            document.head.appendChild(styleContainers.firstElementChild)
        }
    }

    bindEvents() {

        // Handle comments show/hide
        jQuery(document).on('click', '#comments-display:not(.disabled)',
            function() {
                jQuery(this).toggleClass('selected') // what should this look like? CSS needs to be defined
                jQuery('#comment-box-container').toggleClass('hide')
                jQuery('#flow').toggleClass('comments-enabled')
                jQuery('.toolbarcomment button').toggleClass('disabled')
            })
        let that = this
        jQuery(document).on('mousedown', '#comments-filter label',
            function(event) {
                event.preventDefault()
                let filterType = jQuery(this).attr("data-filter")

                switch (filterType) {
                    case 'r':
                    case 'w':
                    case 'e':
                    case 'c':
                        that.filterByUserType(filterType)
                        break
                    case 'username':
                        that.filterByUserDialog()
                        break
                }
            }
        )

        let pm = this.mod.editor.pm
        pm.updateScheduler([pm.on.change, pm.on.setDoc], () => that.onChange())
        pm.updateScheduler([pm.on.selectionChange], () => that.onSelectionChange())

    }

    activateComment(id) {
        this.deactivateAll()
        this.activeCommentId = id
    }

    deactivateAll() {
        this.activeCommentId = false
        this.activeCommentAnswerId = false
        // If there is a comment currently under creation, remove it.
        this.mod.store.removeCommentDuringCreation()
    }

    findCommentId(node) {
        let found = false
        for (let i = 0; i < node.marks.length; i++) {
            let mark = node.marks[i]
            if (mark.type.name === 'comment' && mark.attrs.id)
                found = mark.attrs.id
        }
        return found
    }

    findComment(id) {
        let found = false
        if (id in this.mod.store.comments) {
            found = this.mod.store.comments[id]
        }
        return found
    }

    findCommentsAt(node) {
        let found = false
        let id = this.findCommentId(node)
        return this.findComment(id)
    }


    layoutComments() {
        this.mod.editor.pm.scheduleDOMUpdate(() => this.updateDOM())
    }

    isCurrentlyEditing() {
        // Returns true if
        // A) a comment form is currently open
        // B) the comment answer edit form is currently open
        // C) part of a new answer has been written
        // D) the focus is currently in new answer text area of a comment
        // E) a new comment form is about to be displayed, but the updateDOM
        // call has not yet been made.
        if (this.activeCommentId !== false) {
            if (jQuery('.commentText:visible').length > 0) {
                // a comment form is currently open
                return true
            }
            if (jQuery('.submit-comment-answer-edit').length > 0) {
                // a comment answer edit form is currently open
                return true
            }
            let answerForm = jQuery('.comment-answer-text:visible')
            if (answerForm.length > 0 && answerForm.val().length > 0) {
                // Part of an answer to a comment has been entered.
                return true
            }
            if (answerForm.length > 0 && answerForm.is(':focus')) {
                // There is currently focus in the comment answer form
                return true
            }
            if (this.mod.store.commentDuringCreation.inDOM === false) {
                // A new comment is about to be created, but it has not
                // yet been added to the DOM.
                return true
            }
        }
        return false
    }

    onSelectionChange() {
        // Give up if the user is currently editing a comment.
        if (this.isCurrentlyEditing()) {
            return false
        }
        this.activateSelectedComment()
        return this.updateDOM()
    }

    onChange() {
        // Give up if the user is currently editing a comment.
        if (this.isCurrentlyEditing()) {
            return false
        }
        return this.updateDOM()
    }

    // Activate the comments included in the selection or the comment where the
    // caret is placed, if the editor is in focus.
    activateSelectedComment() {

        let selection = this.mod.editor.pm.selection, comment = false

        if (selection.empty) {
            let node = this.mod.editor.pm.doc.nodeAt(selection.from)
            if (node) {
                comment = this.findCommentsAt(node)
            }
        } else {
            this.mod.editor.pm.doc.nodesBetween(
                selection.from,
                selection.to,
                (node, pos, parent) => {
                    if (!node.isInline) {
                        return
                    }
                    comment = comment ? comment : this.findCommentsAt(node)
                }
            )
        }

        if (comment) {
            if (this.activeCommentId !== comment.id) {
              this.activateComment(comment.id)
            }
        } else {
            this.deactivateAll()
        }
    }

    updateDOM() {
        // Handle the layout of the comments on the screen.
        // DOM write phase

        let theComments = [], referrers = [], activeCommentStyle = ''

        this.mod.editor.pm.doc.descendants((node, pos, parent) => {
            if (!node.isInline) {
                return
            }
            let commentId = this.findCommentId(node)
            if (!commentId) {
                return
            }
            let comment = this.findComment(commentId)
            if (!comment) {
                // We have no comment with this ID. Ignore the referrer.
                return;
            }
            if (theComments.indexOf(comment) !== -1) {
                // comment already placed
                return
            }
            if (comment.id === this.activeCommentId) {
                activeCommentStyle +=
                    `.comments-enabled .comment[data-id="${comment.id}"] {background-color: #fffacf;}`
            } else {
                activeCommentStyle +=
                    `.comments-enabled .comment[data-id="${comment.id}"] {background-color: #f2f2f2;}`
            }
            theComments.push(comment)
            referrers.push(pos)
        })

        // Add a comment that is currently under construction to the list.
        if(this.mod.store.commentDuringCreation) {
            let pos = this.mod.store.commentDuringCreation.referrer.from
            let comment = this.mod.store.commentDuringCreation.comment
            let index = 0
            // We need the position of the new comment in relation to the other
            // comments in order to insert it in the right place
            while (referrers[index] < pos) {
                index++
            }
            theComments.splice(index, 0, comment)
            referrers.splice(index, 0, pos)
            activeCommentStyle += '.comments-enabled .active-comment {background-color: #fffacf;}'
            this.mod.store.commentDuringCreation.inDOM = true
        }

        let commentsTemplateHTML = commentsTemplate({
            theComments,
            localizeDate,
            that: this
        })
        if (document.getElementById('comment-box-container').innerHTML !== commentsTemplateHTML) {
            document.getElementById('comment-box-container').innerHTML = commentsTemplateHTML
        }


        if (document.getElementById('active-comment-style').innerHTML != activeCommentStyle) {
            document.getElementById('active-comment-style').innerHTML = activeCommentStyle
        }

        return () => {
            // DOM read phase
            let totalOffset = document.getElementById('comment-box-container').getBoundingClientRect().top + 10,
              commentBoxes = document.querySelectorAll('#comment-box-container .comment-box'),
              commentPlacementStyle = ''
            referrers.forEach((referrer, index) => {
                let commentBox = commentBoxes[index]
                if (commentBox.classList.contains("hidden")) {
                    return
                }
                let commentBoxCoords = commentBox.getBoundingClientRect(),
                  commentBoxHeight = commentBoxCoords.height,
                  referrerTop = this.mod.editor.pm.coordsAtPos(referrer).top,
                  topMargin = 10

                if (referrerTop > totalOffset) {
                    topMargin = parseInt(referrerTop - totalOffset)
                    commentPlacementStyle += '.comment-box:nth-of-type('+(index+1)+') {margin-top: ' + topMargin + 'px;}\n'
                }
                totalOffset += commentBoxHeight + topMargin
            })
            return function () {
                //DOM write phase
                if (document.getElementById('comment-placement-style').innerHTML != commentPlacementStyle) {
                    document.getElementById('comment-placement-style').innerHTML = commentPlacementStyle
                }
            }

        }

    }

    /**
     * Filtering part. akorovin
     */
    filterByUserType(userType) {
        //filter by user role (reader, editor, reviewer etc)
        let userRoles = this.mod.editor.doc.access_rights
        let idsOfNeededUsers = []

        jQuery.each(userRoles, function(index, user) {
            if (user.rights == userType) {
                idsOfNeededUsers.push(user.user_id)
            }
        })

        jQuery("#comment-box-container").children().each(function() {
            var userId = parseInt(jQuery(this).attr("data-user-id"), 10)
            if (jQuery.inArray(userId, idsOfNeededUsers) !== -1) {
                jQuery(this).show()
            } else {
                jQuery(this).hide()
            }
        })
    }

    filterByUserDialog() {
        //create array of roles + owner role
        let rolesCopy = this.mod.editor.doc.access_rights.slice()
        rolesCopy.push({
            user_name: this.mod.editor.doc.owner.name,
            user_id: this.mod.editor.doc.owner.id
        })

        let users = {
            users: rolesCopy
        }

        jQuery('body').append(filterByUserBoxTemplate(users))
        let diaButtons = {}
        diaButtons[gettext('Filter')] = function() {
            let id = jQuery(this).children("select").val()
            if (id === undefined) {
                return
            }

            let boxesToHide = jQuery("#comment-box-container").children("[data-user-id!='" + id + "']").hide()
                //let boxesToHide = jQuery("#comment-box-container").children("[data-user-id='" + id + "']").show()

            //TODO: filtering
            jQuery(this).dialog("close")
        }

        diaButtons[gettext('Cancel')] = function() {
            jQuery(this).dialog("close")
        }

        jQuery("#comment-filter-byuser-box").dialog({
            resizable: false,
            height: 180,
            modal: true,
            close: function() {
                jQuery("#comment-filter-byuser-box").detach()
            },
            buttons: diaButtons,
            create: function() {
                let theDialog = jQuery(this).closest(".ui-dialog");
                theDialog.find(".ui-button:first-child").addClass("fw-button fw-dark")
                theDialog.find(".ui-button:last").addClass("fw-button fw-orange")
            }
        })
    }


}
