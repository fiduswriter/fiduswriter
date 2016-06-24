import {commentsTemplate, filterByUserBoxTemplate} from "./templates"
import {UpdateScheduler} from "prosemirror/dist/edit/update"
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
        let that = this

        // Handle comments show/hide
        jQuery(document).on('click', '#comments-display:not(.disabled)',
            function() {
                jQuery(this).toggleClass('selected') // what should this look like? CSS needs to be defined
                jQuery('#comment-box-container').toggleClass('hide')
                jQuery('#flow').toggleClass('comments-enabled')
                jQuery('.toolbarcomment button').toggleClass('disabled')
            })

        jQuery(document).on('mousedown', '#comments-filter label', function(event) {
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

        })

        new UpdateScheduler(this.mod.editor.pm, "change setDoc", () => {return that.updateDOM()})
        new UpdateScheduler(this.mod.editor.pm, "selectionChange", () => {return that.onSelectionChange()})

    }

    activateComment(id) {
        // Deactivate all comments, then mark the one related to the id as active.
        this.deactivateAll()
        this.activeCommentId = id
    }

    deactivateAll() {
        // Close the comment box and make sure no comment is marked as currently active.
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
        let that = this
        this.mod.editor.pm.scheduleDOMUpdate(() => {return that.updateDOM()})
    }

    onSelectionChange() {
        this.activateSelectedComment()
        return this.updateDOM()
    }

    // Activate the comments included in the selection or the comment where the
    // caret is placed, if the editor is in focus.
    activateSelectedComment() {
        if (!this.mod.editor.pm.hasFocus()) {
            return
        }
        let selection = this.mod.editor.pm.selection, comment = false, that = this

        if (selection.empty) {
            let node = this.mod.editor.pm.doc.nodeAt(selection.from)
            if (node) {
                comment = this.findCommentsAt(node)
            }
        } else {
            this.mod.editor.pm.doc.nodesBetween(selection.from, selection.to, function(node, pos, parent) {
                if (!node.isInline) {
                    return
                }
                comment = comment ? comment : that.findCommentsAt(node)
            })
        }

        if (comment) {
            if (this.activeCommentId !== comment.id) {
              that.activateComment(comment.id)
            }
        } else {
            that.deactivateAll()
        }
    }

    updateDOM() {
        // Handle the layout of the comments on the screen.

        // DOM write phase

        let that = this

        let theComments = [], referrers = [], activeCommentStyle = ''

        this.mod.editor.pm.doc.descendants(function(node, pos, parent) {
            if (!node.isInline) {
                return
            }
            let commentId = that.findCommentId(node)
            if (!commentId) {
                return
            }
            let comment = that.findComment(commentId)
            if (!comment) {
                // We have no comment with this ID. Ignore the referrer.
                return;
            //    comment = new Comment(that.findCommentId(node))
            //    comment.hidden = true // There is no comment with this . Don't show it.
            }
            if (theComments.indexOf(comment) !== -1) {
                // comment already placed
                return
            }
            //if (comment.hidden) {
                // Comment will not show by default.
            //} else
            if (comment.id === that.activeCommentId) {
                activeCommentStyle += '.comments-enabled .comment[data-id="' + comment.id + '"] {background-color: #fffacf;}'
            } else {
                activeCommentStyle += '.comments-enabled .comment[data-id="' + comment.id + '"] {background-color: #f2f2f2;}'
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
        }

        let commentsTemplateHTML = commentsTemplate({
            theComments,
            localizeDate,
            that
        })
        if (document.getElementById('comment-box-container').innerHTML !== commentsTemplateHTML) {
            document.getElementById('comment-box-container').innerHTML = commentsTemplateHTML
        }


        if (document.getElementById('active-comment-style').innerHTML != activeCommentStyle) {
            document.getElementById('active-comment-style').innerHTML = activeCommentStyle
        }

        return function () {
            // DOM read phase
            let totalOffset = document.getElementById('comment-box-container').getBoundingClientRect().top + 10,
              commentBoxes = document.querySelectorAll('#comment-box-container .comment-box'),
              commentPlacementStyle = ''
            referrers.forEach(function(referrer, index) {
                let commentBox = commentBoxes[index]
                if (commentBox.classList.contains("hidden")) {
                    return
                }
                let commentBoxCoords = commentBox.getBoundingClientRect(),
                  commentBoxHeight = commentBoxCoords.height,
                  referrerTop = that.mod.editor.pm.coordsAtPos(referrer).top,
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
            if ($.inArray(userId, idsOfNeededUsers) !== -1) {
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
