/* A template for the form for the style upload dialog. */
export let usermediaUploadTemplate = _.template('<div id="uploadstyle" class="fw-media-uploader" title="<%- action %>">\
    <form action="#" method="post" class="usermediaUploadForm">\
        <div>\
            <input name="title" class="fw-media-title fw-media-form" type="text" placeholder="' + gettext('Insert a title') + '" value="<%- title %>" />\
            <div style="padding-top: 10px">\
                <p id="css" style="width: 100px;padding:10px;float: left" class="fw-css-title fw-media-form">Css file:</p>\
                <input name="css" type="file" class="fw-media-cssfile-input fw-media-form">\
            </div>\
            <div style="padding-top: 10px">\
                <p id="latex" style="width: 100px;padding:10px;float: left" class="fw-latex-title fw-media-form">Latex Class:</p>\
                <input name="latexcls" type="file" class="fw-media-latexfile-input fw-media-form">\
            </div>\
            <div style="padding-top: 10px">\
                <p id="docx" style="width: 100px;padding:10px;float: left" class="fw-docx-title fw-media-form">Docx template:</p>\
\               <input name="docx" type="file" class="fw-media-docxfile-input fw-media-form">\
            </div>\
        </div>\
        </div></div>\
    </form></div>')

