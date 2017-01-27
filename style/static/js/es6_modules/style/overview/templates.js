
/** A template for style overview list. */
export let usermediaTableTemplate = _.template('\
                <tr id="style_<%- pk %>" >\
                    <td width="30">\
                        <span class="fw-inline">\
                            <input type="checkbox" class="entry-select" data-id="<%- pk %>">\
                        </span>\
                    </td>\
                    <td  class="title">\
                        <span style="width:170px" class="fw-inline ">\
                            <span class="edit-style fw-link-text fw-searchable" data-id="<%- pk %>">\
                                <%- title !== "" ? title : "'+gettext('Untitled')+'" %>\
                            </span>\
                        </span>\
                    </td>\
                    <td width="170" class="css">\
                        <span style="width:160px" class="fw-inline ">\
                            <span class="edit-style fw-link-text fw-searchable" data-id="<%- pk %>">\
                                <%- css !== "" ? css : "'+gettext('Untitled')+'" %>\
                            </span>\
                        </span>\
                    </td>\
                    <td width="170" class="latex_cls">\
                        <span style="width:160px" class="fw-inline ">\
                            <span class="edit-style fw-link-text fw-searchable" data-id="<%- pk %>">\
                                <%- latexcls !== "" ? latexcls : "'+gettext('Untitled')+'" %>\
                            </span>\
                        </span>\
                    </td>\
                    <td  class="word_cls">\
                        <span style="width:160px" class="fw-inline ">\
                            <span class="edit-style fw-link-text fw-searchable" data-id="<%- pk %>">\
                                <%- docx !== "" ? docx : "'+gettext('Untitled')+'" %>\
                            </span>\
                        </span>\
                    </td>\
                    <td width="170" class="type ">\
                        <span class="fw-inline"></span>\
                    </td>\
                    <td width="170" class="file_type ">\
                        <span class="fw-inline">added</span>\
                    </td>\
                    <td width="50" align="center">\
                        <span class="delete-style fw-inline fw-link-text" data-id="<%- pk %>" data-title="<%- title %>">\
                            <i class="icon-trash"></i>\
                        </span>\
                    </td>\
                </tr>')
