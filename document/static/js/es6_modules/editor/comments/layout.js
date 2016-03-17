import {commentsTemplate, filterByUserBoxTemplate} from "./templates"

/* Functions related to layouting of comments */
export class ModCommentLayout {
    constructor(mod) {
        mod.layout = this
        this.mod = mod
        this.activeCommentId = -1
        this.activeCommentAnswerId = -1
        this.bindEvents()
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

    }

    activateComment(id) {
        // Deactivate all comments, then mark the one related to the id as active.
        this.deactivateAll()
        this.activeCommentId = id
    }

    deactivateAll() {
        // Close the comment box and make sure no comment is marked as currently active.
        this.activeCommentId = -1
        this.activeCommentAnswerId = -1
    }


    layoutCommentsAvoidOverlap() {
        // Avoid overlapping of comments.
        var minOffsetTop,
            commentReferrer,
            lastOffsetTop,
            previousComments,
            nextComments,
            commentBox,
            initialCommentBox,
            foundComment,
            i

        if (-1 != this.activeCommentId) {
            commentReferrer = this.findComment(this.activeCommentId)
            initialCommentBox = this.findCommentBox(this.activeCommentId)
            if (!initialCommentBox) {
                return false
            }
            lastOffsetTop = initialCommentBox.offsetTop
            previousComments = []
            nextComments = jQuery.makeArray(jQuery('.comment'))
            while (nextComments.length > 0) {
                foundComment = nextComments.shift()
                if (foundComment === commentReferrer) {
                    break
                } else {
                    previousComments.unshift(foundComment)
                }
            }

            for (i = 0; i < previousComments.length; i++) {
                commentBox = this.findCommentBox(this.getCommentId(previousComments[i]))
                if (commentBox) {
                    minOffsetTop = lastOffsetTop - commentBox.offsetHeight - 10
                    if (commentBox.offsetTop > minOffsetTop) {
                        jQuery(commentBox).css('top', minOffsetTop + 'px')
                    }
                    lastOffsetTop = commentBox.offsetTop;
                }
            }

            minOffsetTop = initialCommentBox.offsetTop + initialCommentBox.offsetHeight + 10
        } else {
            minOffsetTop = 0
            nextComments = jQuery('.comment')
        }
        for (i = 0; i < nextComments.length; i++) {
            commentBox = this.findCommentBox(this.getCommentId(nextComments[i]))
            if (commentBox) {
                if (commentBox.offsetTop < minOffsetTop) {
                    jQuery(commentBox).css('top', minOffsetTop + 'px')
                }
                minOffsetTop = commentBox.offsetTop + commentBox.offsetHeight + 10
            }
        }
    }

    layoutComments() {
        // Handle the layout of the comments on the screen.
        let that = this
        let theCommentPointers = [].slice.call(jQuery('.comment')),
            theComments = [],
            ids = []

        theCommentPointers.forEach(function(commentNode) {
            let id = parseInt(commentNode.getAttribute("data-id"))
            if (ids.indexOf(id) !== -1) {
                // This is not the first occurence of this comment. So we ignore it.
                return
            }
            ids.push(id)
            if (that.mod.store.comments[id]) {
                theComments.push({
                    id: id,
                    referrer: commentNode,
                    comment: that.mod.store.comments[id]['comment'],
                    user: that.mod.store.comments[id]['user'],
                    userName: that.mod.store.comments[id]['userName'],
                    userAvatar: that.mod.store.comments[id]['userAvatar'],
                    date: that.mod.store.comments[id]['date'],
                    answers: that.mod.store.comments[id]['answers'],
                    'review:isMajor': that.mod.store.comments[id]['review:isMajor']
                })
            }
        })

        jQuery('#comment-box-container').html(commentsTemplate({
            theComments,
            that
        }))
        this.layoutCommentsAvoidOverlap()
        let activeCommentStyle = ''
            //jQuery('#active-comment-style').html('')
        let activeCommentWrapper = jQuery('.comment-box.active')
        if (0 < activeCommentWrapper.size()) {
            that.activeCommentId = activeCommentWrapper.attr('data-id')

            activeCommentStyle = '.comments-enabled .comment[data-id="' + that.activeCommentId + '"] {background-color: #fffacf;}'
            activeCommentWrapper.find('.comment-answer-text').autoResize({
                'extraSpace': 0
            })
        }

        if (jQuery('#active-comment-style').html() != -activeCommentStyle) {
            jQuery('#active-comment-style').html(activeCommentStyle)
        }

    }


    editAnswer(id, answerId) {
        // Mark a specific answer to a comment as active, then layout the
        // comments, which will make that answer editable.
        this.activeCommentId = id
        this.activeCommentAnswerId = answerId
        this.layoutComments()
    }


    calculateCommentBoxOffset(comment) {
        return comment.referrer.getBoundingClientRect()['top'] + window.pageYOffset - 280
    }


    findComment(id) {
        // Return the comment element specified by the id
        return jQuery('.comment[data-id=' + id + ']')[0]
    }

    findCommentBox(id) {
        // Return the comment box specified by the id
        return jQuery('.comment-box[data-id=' + id + ']')[0]
    }


    getCommentId(node) {
        // Returns the value of the attributte data-id as an integer.
        // This function can be used on both comment referrers and comment boxes.
        return parseInt(node.getAttribute('data-id'), 10)
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
            if (id == undefined) {
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
                let $the_dialog = jQuery(this).closest(".ui-dialog");
                $the_dialog.find(".ui-button:first-child").addClass("fw-button fw-dark")
                $the_dialog.find(".ui-button:last").addClass("fw-button fw-orange")
            }
        })
    }


}
