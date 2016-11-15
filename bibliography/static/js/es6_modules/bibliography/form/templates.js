/** A template to select the bibliography item source type */
export let sourcetypeTemplate = _.template('<div id="source-type-selection" class="fw-button fw-white fw-large">\
        <input type="hidden" id="id_<%- fieldName %>" name="<%- fieldName %>" value="<%- fieldValue %>" />\
        <span id="selected-source-type-title"><%= fieldTitle %></span>\
        <span class="icon-down-dir"></span>\
        <div class="fw-pulldown fw-center">\
            <ul><% Object.keys(options).forEach(function(key) { %>\
                <li>\
                    <span class="fw-pulldown-item" data-value="<%- key %>"><%= titles[key] %></span>\
                </li>\
            <% }) %></ul>\
        </div>\
    </div>')

/** A template for the bibliography item edit dialog. */
export let createBibitemTemplate = _.template('\
    <div id="createbook" title="<%- dialogHeader %>">\
        <%= sourcetype %>\
        <div id="bookoptionsTab">\
            <ul>\
                <li><a href="#optionTab1" class="fw-button fw-large">' + gettext('Required Fields') + '</a></li>\
                <li><a href="#optionTab2" class="fw-button fw-large">' + gettext('Optional Fields') + '</a></li>\
                <li><a href="#optionTab3" class="fw-button fw-large">' + gettext('Extras') + '</a></li>\
            </ul>\
            <div id="optionTab1"><table class="fw-dialog-table"><tbody><%= requiredfields %></tbody></table></div>\
            <div id="optionTab2"><table class="fw-dialog-table"><tbody><%= optionalfields %></tbody></table></div>\
            <div id="optionTab3"><table class="fw-dialog-table"><tbody><%= extras %></tbody></table></div>\
        </div>\
    </div>')

/* A template to show the category selection pane of the bibliography item edit dialog. */
export let categoryTemplate = _.template('\
    <tr>\
        <th><h4 class="fw-tablerow-title"><%- fieldTitle %></h4></th>\
        <td><% _.each(categories, function(cat) { %>\
            <label class="fw-checkable fw-checkable-label<%- cat.checked %>" for="entryCat<%- cat.id %>"><%- cat.category_title %></label>\
            <input class="fw-checkable-input entry-cat" type="checkbox" id="entryCat<%- cat.id %>" name="entryCat" value="<%- cat.id %>"<%- cat.checked %> />\
        <% }) %></td>\
    </tr>')

/** A template of a date input row of the bibliography item edit form. */
export let dateinputTrTemplate = _.template('<tr class="date-input-tr" data-format="<%= format %>">\
        <th>\
            <div class="fw-data-format-pulldown fw-bib-form-pulldown">\
                <label><%- fieldTitle %> <span>(<%- dateFormat[format] %>)</span></label>\
                <span class="icon-down-dir"></span>\
                <div class="fw-pulldown fw-left">\
                    <ul><% _.each(dateFormat, function(format_title, key) { %>\
                        <li>\
                            <span class="fw-pulldown-item<% if(key == format) { %> selected<% } %>"\
                                data-value="<%= key %>">\
                                <%- format_title %>\
                            </span>\
                        </li>\
                    <% }) %></ul>\
                </div>\
            </div>\
        </th>\
        <%= inputForm %>\
    </tr>')

/** A template for each input field row of the bibliography item edit form. */
export let inputTrTemplate = _.template('\
    <tr>\
        <th><h4 class="fw-tablerow-title"><%- gettext(fieldTitle) %></h4></th>\
        <%= inputForm %>\
    </tr>')

/** A template for either-or fields in the bibliography item edit form. */
export let eitherorTrTemplate = _.template('<tr class="eitheror">\
        <th>\
            <div class="fw-bib-field-pulldown fw-bib-form-pulldown">\
                <label><%- BibFieldTitles[selected] %></label>\
                <span class="icon-down-dir"></span>\
                <div class="fw-pulldown field-names fw-left">\
                    <ul><% _.each(fields, function(field) { %>\
                        <li>\
                            <span class="fw-pulldown-item<% if(selected == field) { %> selected<% } %>"\
                                data-value="<%= field %>">\
                                <%- BibFieldTitles[field] %>\
                            </span>\
                        </li>\
                    <% }) %></ul>\
                </div>\
            </div>\
        </th>\
        <%= inputForm %>\
    </tr>')

/** A template for date input fields in the bibliography item edit form. */
export let dateinputTemplate = _.template('<td class="entryForm fw-date-form" data-type="date" data-field-name="<%- fieldName %>">\
        <table class="fw-bib-date-table"><tr>\
            <td class="month-td"><input <%= monthSelect %> placeholder="Month" /></td>\
            <td class="day-td"><input <%= dateSelect %> placeholder="Day" /></td>\
            <td class="year-td"><input <%= yearSelect %> placeholder="Year" /></td>\
            <td class="fw-date-separator">-</td>\
            <td class="month-td2"><input <%= month2Select %> placeholder="Month" /></td>\
            <td class="day-td2"><input <%= date2Select %> placeholder="Day" /></td>\
            <td class="year-td2"><input <%= year2Select %> placeholder="Year" /></td>\
        </tr></table>\
    </td>')

/** A template for each item (year, date, month) of a date input fields in the bibliography item edit form. */
export let dateselectTemplate = _.template('type="text" name="<%- formname %>" class="select-<%- type %>" value="<%- value %>"')

export let listInputTemplate = _.template('<td class="entryForm" data-type="<%- filedType %>" data-field-name="<%- fieldName %>">\
        <%= inputForm %>\
    </td>')

/** A template for name list fields (authors, editors) in the bibliography item edit form. */
export let namelistInputTemplate = _.template('<% _.each(fieldValue, function(val) { %>\
        <div class="fw-list-input">\
            <input type="text" class="fw-name-input fw-first" value="<%= val.first %>" placeholder="' + gettext('First Name') + '" />\
            <input type="text" class="fw-name-input fw-last" value="<%= val.last %>" placeholder="' + gettext('Last Name') + '" />\
            <span class="fw-add-input icon-addremove"></span>\
        </div>\
    <% }) %>')

/** A template for name list field items in the bibliography item edit form. */
export let literallistInputTemplate = _.template('<% _.each(fieldValue, function(val) { %>\
        <div class="fw-list-input"><input class="fw-input" type="text" value="<%= val %>" /><span class="fw-add-input icon-addremove"></span></div>\
    <% }) %>')

/** A template for selection fields in the bibliography item edit form. */
export let selectTemplate = _.template('<td>\
        <div class="fw-bib-select-pulldown fw-button fw-white">\
            <label><% if("" == fieldValue) { %><%- fieldDefault.title %><% } else { %><%- fieldTitle %><% } %></label>\
            <span class="icon-down-dir"></span>\
            <div class="fw-pulldown fw-left">\
                <ul class="entryForm" data-field-name="<%- fieldName %>" data-type="fieldkeys" id="id_<%- fieldName %>">\
                    <% if("" != fieldDefault.value) { %>\
                        <li><span\
                            class="fw-pulldown-item<% if("" == fieldValue || fieldDefault.value == fieldValue) { %> selected<% } %>"\
                            data-value="<%- fieldDefault.value %>">\
                            <%- fieldDefault.title %>\
                        </span></li>\
                    <% } %>\
                    <% _.each(options, function(option) { %>\
                        <li><span\
                            class="fw-pulldown-item<% if(option.value == fieldValue) { %> selected<% } %>"\
                            data-value="<%- option.value %>">\
                            <%- option.title %>\
                        </span></li>\
                    <% }) %>\
                </ul>\
            </div>\
        </div>\
    </td>')

/** A template for each input field of the bibliography item edit form. */
export let inputTemplate = _.template('<td>\
        <input class="entryForm" type="<%- fieldType %>" name="<%- fieldName %>" id="id_<%- fieldName %>" value="<%- fieldValue %>" />\
    </td>')
