/**
 * @file Handles the visual elements of the track changes feature.
 * @copyright This file is part of <a href='http://www.fiduswriter.org'>Fidus Writer</a>.
 *
 * Copyright (C) 2013 Takuto Kojima, Johannes Wilm.
 *
 * @license This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <a href='http://www.gnu.org/licenses'>http://www.gnu.org/licenses</a>.
 *
 */

(function () {
    var exports = this,
   /** Helper functions for dealing with tracked changes.
   * @namespace trackingHelpers
  */  
        trackingHelpers = {};

    /** Creates a dialog to accept or reject a change.
     * @function createReviewBox
     * @memberof trackingHelpers
     * @param changeNode The change node that is to be rejected/accepted.
     */    
    trackingHelpers.createReviewBox = function(changeNode) {
        var changeOwner, changeTime;
        var $changeNode = jQuery(changeNode);
        var cid = $changeNode.attr('data-cid');
        var owner_id = parseInt($changeNode.attr('data-userid'), 10);
        var node_class = _.detect($changeNode.attr('class').split(' '), function(class_name) { return 0 <= class_name.indexOf('cts-'); });
        changeNode = jQuery(".ins[data-cid="+cid+"], .del[data-cid="+cid+"]")[0];
        var changeNodeOffset = {
            'top': (commentHelpers.calculateCommentBoxOffset(changeNode) - 100) + 'px',
            'left': (changeNode.offsetLeft + 65) + 'px'
        };
        if (owner_id===theUser.id) {
            // The comment was written by the current user and owner of the document.
            changeOwner = {
                'user_name': theUser.name,
                'avatar': theUser.avatar
            };
        } else {
            changeOwner = _.detect(theDocument.access_rights, function(user){ return user.user_id === owner_id; });
            if(typeof changeOwner === 'undefined') {
                // The change was made a user who no longer has access rights
                changeOwner = {
                    'user_name': gettext('Unknown'),
                    'avatar': staticUrl + 'img/default_avatar.png'
                };            
            }
        }
        changeTime = new Date(parseInt($changeNode.attr('data-time'), 10)).toLocaleString();
        jQuery('#tracking-box-container').html(_.template(tmp_reviewchangebox, {
            'cid':cid,
            'node_class': node_class + '-review',
            'node_offset': changeNodeOffset,
            'change_owner': changeOwner,
            'change_time': changeTime
        }));
    };
    /** Marks a change as accepted.
     * @function acceptChange
     * @memberof trackingHelpers
     * @param cid data-cid attribute of the track node that will be accepted.
     */      
    trackingHelpers.acceptChange = function(cid) {
        var changeNodes = jQuery('.ins[data-cid='+cid+'],.del[data-cid='+cid+']');
        for (var i=0;i<changeNodes.length;i++) {
            window.tracker.acceptChange(changeNodes[i]);
        }
        editorHelpers.documentHasChanged();
    };
    /** Marks a change as rejected.
     * @function rejectChange
     * @memberof trackingHelpers
     * @param cid data-cid attribute of the track node that will be rejected.
     */         
    trackingHelpers.rejectChange = function(cid) {
        var changeNodes = jQuery('.ins[data-cid='+cid+'],.del[data-cid='+cid+']');
        for (var i=0;i<changeNodes.length;i++) {
            window.tracker.rejectChange(changeNodes[i]);
        }
        editorHelpers.documentHasChanged();
    };
        /** Bind events related to clicking on change nodes.
     * @function bindEvents
     * @memberof trackingHelpers
     */     
    
    trackingHelpers.bindEvents = function() {
        jQuery(document).on("click", ".ins,.del", function(){
            // Disable change review menu if changes are not shown.
            if (jQuery('#flow').is('.CT-hide')) return false;
            trackingHelpers.createReviewBox(this);
        });
        
        jQuery(document).on("click", ".review-box .close", function(){
            jQuery('#tracking-box-container').html('');
        });
        
        jQuery(document).on("click", ".review-box .accept", function(){
            var cid = jQuery(this).parent().attr('data-cid');
            trackingHelpers.acceptChange(cid);
            jQuery('#tracking-box-container').html('');
        });
        
        jQuery(document).on("click", ".review-box .reject", function(){
            var cid = jQuery(this).parent().attr('data-cid');
            trackingHelpers.rejectChange(cid);
            jQuery('#tracking-box-container').html('');
        });
            
    };

    exports.trackingHelpers = trackingHelpers;

}).call(this);
