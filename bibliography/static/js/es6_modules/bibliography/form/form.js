import {
    formatDateString,
    addRemoveListHandler,
    dateFormat
} from "../tools"

import {
    sourcetypeTemplate,
    createBibitemTemplate,
    categoryTemplate,
    dateinputTrTemplate,
    inputTrTemplate,
    eitherorTrTemplate,
    dateinputTemplate,
    dateselectTemplate,
    listInputTemplate,
    namelistInputTemplate,
    literallistInputTemplate,
    selectTemplate,
    inputTemplate
} from "./templates"

import {
    LocalizationKeys, BibEntryTypes, BibFieldTypes
} from "../statics.js"

export class BibEntryForm {
    constructor(itemId, sourceType, bibDB, bibCats, ownerId, callback) {
        this.itemId = itemId // The id of the bibliography item (if available).
        this.sourceType = sourceType // The id of the type of source (a book, an article, etc.).
        this.bibDB = bibDB
        this.bibCats = bibCats
        this.ownerId = ownerId
        this.callback = callback
        this.createBibEntryDialog()
    }

    /** Opens a dialog for creating or editing a bibliography entry.
     */
    createBibEntryDialog() {
        let rFields, oFields, eoFields, dialogHeader, id = this.itemId,
            type = this.sourceType, entryCat,
            that = this
        if (!id) {
            dialogHeader = gettext('Register New Source')
            id = 0
            rFields = []
            oFields = []
            eoFields = []
            entryCat = []
        } else {
            dialogHeader = gettext('Edit Source')
            let entryType = BibEntryTypes[type]
            rFields = entryType.required
            oFields = entryType.optional
            eoFields = entryType.eitheror
            entryCat = this.bibDB[id]['entry_cat'].split(',')
        }
        //restore the categories and check if the category is selected
        let eCats = []
        jQuery.each(this.bibCats, function(i, eCat) {
                let len = eCats.length
                eCats[len] = {
                    'id': eCat.id,
                    'category_title': eCat.category_title
                }
                if (0 <= jQuery.inArray(String(eCat.id), entryCat)) {
                    eCats[len].checked = ' checked'
                } else {
                    eCats[len].checked = ''
                }
            })
            //get html of select form for selecting a entry type
            //template function from underscore.js

        let typeTitle = ''
        if ('' == type || typeof(type) === 'undefined') {
            typeTitle = gettext('Select source type')
        } else {
            typeTitle = BibEntryTypes[type]['title']
        }

        let sourType = sourcetypeTemplate({
            'fieldTitle': typeTitle,
            'fieldName': 'entrytype',
            'fieldValue': type,
            'options': BibEntryTypes
        })

        //get html of dialog body

        let dialogBody = createBibitemTemplate({
            'dialogHeader': dialogHeader,
            'sourcetype': sourType,
            'requiredfields': this.getFieldForms(rFields, eoFields, id),
            'optionalfields': this.getFieldForms(oFields, [], id),
            'extras': categoryTemplate({
                'fieldTitle': gettext('Categories'),
                'categories': eCats
            })
        })
        jQuery('body').append(dialogBody)

        //open dropdown for selecting source type
        $.addDropdownBox(jQuery('#source-type-selection'), jQuery('#source-type-selection > .fw-pulldown'))
        jQuery('#source-type-selection .fw-pulldown-item').bind('mousedown', function() {
            let source_type_title = jQuery(this).html(),
                source_type_id = jQuery(this).attr('data-value')
            jQuery(this).parent().siblings('.selected').removeClass('selected')
            jQuery(this).parent().addClass('selected')
            jQuery('#selected-source-type-title').html(source_type_title)
            jQuery('#id_entrytype').val(source_type_id).trigger('change')
        })

        //when the entry type is changed, the whole form has to be updated
        jQuery('#id_entrytype').bind('change', function() {
            let thisVal = jQuery(this).val()
            if ('' != thisVal) {
                that.updateBibEntryDialog(id, thisVal)
                type = thisVal
            }
            jQuery('#bookoptionsTab').show()
        })

        //add and remove name list field
        addRemoveListHandler()
        let diaButtons = {}
        diaButtons[gettext('Submit')] = function() {
            if (type) {
                that.onCreateBibEntrySubmitHandler(id)
            }
        }
        diaButtons[gettext('Cancel')] = function() {
            jQuery(this).dialog('close')
        }

        let dia_height = 500
        jQuery("#createbook").dialog({
            draggable: false,
            resizable: false,
            width: 710,
            height: dia_height,
            modal: true,
            //position: ['center', 80],
            buttons: diaButtons,
            create: function() {
                let theDialog = jQuery(this).closest(".ui-dialog")
                theDialog.find(".ui-dialog-buttonpane").addClass('createbook')
                theDialog.find(".ui-button:first-child").addClass("fw-button fw-dark")
                theDialog.find(".ui-button:last").addClass("fw-button fw-orange")
            },
            close: function() {
                jQuery("#createbook").dialog('destroy').remove()
            }
        })

        // init ui tabs
        jQuery('#bookoptionsTab').tabs()

        // resize dialog height
        jQuery('#createbook .ui-tabs-panel').css('height', dia_height - 256)
        if ('' == jQuery('#id_entrytype').val())
            jQuery('#bookoptionsTab').hide()
        jQuery('.fw-checkable-label').bind('click', function() {
            $.setCheckableLabel(jQuery(this))
        })
    }

    /** Return html with form elements for the bibliography entry dialog.
     * @function getFieldForms
     * @param fields A list of the fields
     * @param eitheror Fields of which either entry A or B is obligatory.
     * @param id The id of the bibliography entry.
     */

    getFieldForms(fields, eitheror, id) {
        let that = this
        if (null == eitheror || undefined == eitheror) {
            eitheror = []
        }
        let ret = ''
        let eitheror_fields = [],
            the_value

        jQuery.each(fields, function() {
            //if the fieldtype must be "either or", then save it in the array
            if (0 === id) {
                the_value = ''
            } else {
                the_value = that.bibDB[id][BibFieldTypes[this].name]
                if ('undefined' === typeof(the_value)) {
                    the_value = ''
                }
            }
            //get html with template function of underscore.js
            if ('f_date' == BibFieldTypes[this].type) {
                let date_form_html = that.getFormPart(BibFieldTypes[this], this, the_value),
                    date_format = date_form_html[1]
                ret += dateinputTrTemplate({
                    'fieldTitle': BibFieldTypes[this].title,
                    'format': date_format,
                    'inputForm': date_form_html[0],
                    dateFormat
                })
            } else {
                ret += inputTrTemplate({
                    'fieldTitle': BibFieldTypes[this].title,
                    'inputForm': that.getFormPart(BibFieldTypes[this], this, the_value)
                })
            }
        })

        jQuery.each(eitheror, function() {
            eitheror_fields.push(BibFieldTypes[this])
        })

        if (1 < eitheror.length) {
            let selected_field = eitheror_fields[0]
            jQuery.each(eitheror_fields, function() {
                //if the field has value, get html with template function of underscore.js
                if (0 !== id) {
                    let current_val = that.bibDB[id][this.name]
                    if (null != current_val && 'undefined' != typeof(current_val) && '' != current_val) {
                        selected_field = this
                        return false
                    }
                }
            })

            if (0 === id) {
                the_value = ''
            } else {
                the_value = that.bibDB[id][selected_field.name]
                if ('undefined' === typeof(the_value)) {
                    the_value = ''
                }
            }

            ret = eitherorTrTemplate({
                'fields': eitheror_fields,
                'selected': selected_field,
                'inputForm': that.getFormPart(selected_field, id, the_value)
            }) + ret
        }
        return ret
    }

    /** Change the type of the bibliography item in the form (article, book, etc.)
     * @function updateBibEntryDialog
     * @param id The id of the bibliography entry.
     * @param type The new type of the bibliography entry.
     */

    updateBibEntryDialog(id, type) {
        let entryType = BibEntryTypes[type]

        jQuery('#optionTab1 > table > tbody').html(this.getFieldForms(
            entryType.required,
            entryType.eitheror,
            id
        ))

        jQuery('#optionTab2 > table > tbody').html(this.getFieldForms(
            entryType.optional, [],
            id
        ))

        addRemoveListHandler()
    }

    /** Handles the submission of the bibliography entry form.
     * @function onCreateBibEntrySubmitHandler
     * @param id The id of the bibliography item.
     */
    onCreateBibEntrySubmitHandler(id) {
        //when submitted, the values in form elements will be restored
        let formValues = {
            'id': id,
            'entrytype': jQuery('#id_entrytype').val()
        }
        if (this.ownerId) {
            formValues['owner_id'] = this.ownerId
        }

        jQuery('.entryForm').each(function() {
            let $this = jQuery(this)
            let the_name = $this.attr('name') || $this.attr('data-field-name')
            let the_type = $this.attr('type') || $this.attr('data-type')
            let the_value = ''
            let isMust = (1 == $this.parents('#optionTab1').size())
            let eitheror = $this.parents('.eitheror')
            if (1 == eitheror.size()) {
                //if it is a either-or-field
                let field_names = eitheror.find('.field-names .fw-pulldown-item')
                field_names.each(function() {
                    if (jQuery(this).hasClass('selected')) {
                        the_name = 'eField' + jQuery(this).data('value')
                    } else {
                        formValues['eField' + jQuery(this).data('value')] = ''
                    }
                })
            }

            dataTypeSwitch: switch (the_type) {
                case 'fieldkeys':
                    let selected_key_item = $this.find('.fw-pulldown-item.selected')
                    if (0 == selected_key_item.size()) {
                        selected_key_item = $this.find('.fw-pulldown-item:eq(0)')
                    }
                    the_value = selected_key_item.data('value')
                    break
                case 'date':
                    //if it is a date form, the values will be formatted yyyy-mm-dd
                    let y_val = $this.find('.select-year').val(),
                        m_val = $this.find('.select-month').val(),
                        d_val = $this.find('.select-date').val(),
                        y2_val = $this.find('.select-year2').val(),
                        m2_val = $this.find('.select-month2').val(),
                        d2_val = $this.find('.select-date2').val(),
                        date_format = $this.siblings('th').find('.fw-data-format-pulldown .fw-pulldown-item.selected').data('value'),
                        date_form = '',
                        date_val = '',
                        required_dates,
                        required_values,
                        date_objs = [],
                        i, len

                    switch (date_format) {
                        case 'y':
                            required_values = required_dates = [y_val]
                            date_form = 'Y'
                            break
                        case 'my':
                            required_values = [y_val, m_val]
                            required_dates = [y_val + '/' + m_val]
                            date_form = 'Y/m'
                            break
                        case 'mdy':
                            required_values = [y_val, m_val, d_val]
                            required_dates = [y_val + '/' + m_val + '/' + d_val]
                            date_form = 'Y/m/d'
                            break
                        case 'y/y':
                            required_values = required_dates = [y_val, y2_val]
                            date_form = 'Y-Y2'
                            break
                        case 'my/my':
                            required_values = [y_val, y2_val, m_val, m2_val]
                            required_dates = [y_val + '/' + m_val, y2_val + '/' + m2_val]
                            date_form = 'Y/m-Y2/m2'
                            break
                        case 'mdy/mdy':
                            required_values = [y_val, m_val, d_val, y2_val, m2_val, d2_val]
                            required_dates = [y_val + '/' + m_val + '/' + d_val,
                                y2_val + '/' + m2_val + '/' + d2_val
                            ]
                            date_form = 'Y/m/d-Y2/m2/d2'
                            break
                    }

                    len = required_values.length
                    for (i = 0; i < len; i++) {
                        if ('undefined' === typeof(required_values[i]) || null == required_values[i] || '' == required_values[i]) {
                            the_value = ''
                            break dataTypeSwitch
                        }
                    }

                    len = required_dates.length
                    for (i = 0; i < len; i++) {
                        let date_obj = new Date(required_dates[i])
                        if ('Invalid Date' == date_obj) {
                            the_value = ''
                            break dataTypeSwitch
                        }
                        date_objs.push(date_obj)
                    }

                    date_form = date_form.replace('d', date_objs[0].getUTCDate())
                    date_form = date_form.replace('m', date_objs[0].getUTCMonth() + 1)
                    date_form = date_form.replace('Y', date_objs[0].getUTCFullYear())

                    if (2 == date_objs.length) {
                        date_form = date_form.replace('d2', date_objs[1].getUTCDate())
                        date_form = date_form.replace('m2', date_objs[1].getUTCMonth() + 1)
                        date_form = date_form.replace('Y2', date_objs[1].getUTCFullYear())
                    }

                    the_value = date_form
                    break
                case 'namelist':
                    the_value = []
                    $this.find('.fw-list-input').each(function() {
                        let $tr = jQuery(this)
                        let first_name = jQuery.trim($tr.find(
                            '.fw-name-input.fw-first').val())
                        let last_name = jQuery.trim($tr.find(
                            '.fw-name-input.fw-last').val())
                        let full_name = ''
                        if ('' == first_name && '' == last_name) {
                            return true
                        } else if ('' == last_name) {
                            full_name = '{' + first_name + '}'
                        } else if ('' == first_name) {
                            full_name = '{' + last_name + '}'
                        } else {
                            full_name = '{' + first_name + '} {' + last_name + '}'
                        }
                        the_value[the_value.length] = full_name
                    })
                    if (0 == the_value.length) {
                        the_value = ''
                    } else {
                        the_name += '[]'
                    }
                    break
                case 'literallist':
                    the_value = []
                    $this.find('.fw-list-input').each(function() {
                        let input_val = jQuery.trim(jQuery(this).find('.fw-input').val())
                        if ('' == input_val) return true
                        the_value[the_value.length] = '{' + input_val + '}'
                    })
                    if (0 == the_value.length) {
                        the_value = ''
                    } else {
                        the_name += '[]'
                    }
                    break
                case 'checkbox':
                    //if it is a checkbox, the value will be restored as an Array
                    the_name = the_name + '[]'
                    if (undefined == formValues[the_name]) formValues[the_name] = []
                    if ($this.prop("checked")) formValues[the_name][formValues[
                        the_name].length] = $this.val()
                    return
                default:
                    the_value = $this.val().replace(/(^\s+)|(\s+$)/g, "")
            }

            if (isMust && (undefined == the_value || '' == the_value)) {
                the_value = 'null'
            }
            formValues[the_name] = the_value
        })
        this.callback(formValues)
        jQuery('#createbook .warning').detach()
        jQuery("#createbook").dialog('close')
    }

    /** Recover the current value of a certain field in the bibliography item form.
     * @function getFormPart
     * @param form_info Information about the field -- such as it's type (date, text string, etc.)
     * @param the_id The id specifying the field.
     * @param the_value The current value of the field.
     */
    getFormPart(form_info, the_id, the_value) {
        let the_type = form_info.type
        let field_name = 'eField' + the_id
        switch (the_type) {
            case 'f_date':
                the_value = formatDateString(the_value)
                let dates = the_value.split('-'),
                    y_val = ['', ''],
                    m_val = ['', ''],
                    d_val = ['', ''],
                    min_date_length = 3,
                    date_format,
                    len = dates.length

                for (let i = 0; i < len; i++) {
                    let values = dates[i].split('/'),
                        values_len = values.length

                    y_val[i] = values[0]
                    if (1 < values_len) {
                        m_val[i] = values[1]
                    }
                    if (2 < values_len) {
                        d_val[i] = values[2]
                    }
                    if (values_len < min_date_length) {
                        min_date_length = values_len
                    }
                }

                if (1 < len) {
                    if (2 < min_date_length) {
                        date_format = 'mdy/mdy'
                    } else if (1 < min_date_length) {
                        date_format = 'my/my'
                    } else {
                        date_format = 'y/y'
                    }
                } else {
                    if (2 < min_date_length) {
                        date_format = 'mdy'
                    } else if (1 < min_date_length) {
                        date_format = 'my'
                    } else {
                        date_format = 'y'
                    }
                }

                return [
                    dateinputTemplate({
                        'fieldName': field_name,
                        'dateSelect': dateselectTemplate({
                            'type': 'date',
                            'formname': 'date' + the_id,
                            'value': d_val[0]
                        }),
                        'monthSelect': dateselectTemplate({
                            'type': 'month',
                            'formname': 'month' + the_id,
                            'value': m_val[0]
                        }),
                        'yearSelect': dateselectTemplate({
                            'type': 'year',
                            'formname': 'year' + the_id,
                            'value': y_val[0]
                        }),
                        'date2Select': dateselectTemplate({
                            'type': 'date2',
                            'formname': 'date2' + the_id,
                            'value': d_val[1]
                        }),
                        'month2Select': dateselectTemplate({
                            'type': 'month2',
                            'formname': 'month2' + the_id,
                            'value': m_val[1]
                        }),
                        'year2Select': dateselectTemplate({
                            'type': 'year2',
                            'formname': 'year2' + the_id,
                            'value': y_val[1]
                        })
                    }),
                    date_format
                ]
                break
            case 'l_name':
                let names = the_value.split('} and {'),
                    name_values = []

                for (let i = 0; i < names.length; i++) {
                    let name_parts = names[i].split('} {'),
                        f_name = name_parts[0].replace('{', '').replace('}', ''),
                        l_name = (1 < name_parts.length) ? name_parts[1].replace('}', '') : ''
                    name_values[name_values.length] = {
                        'first': f_name,
                        'last': l_name
                    }
                }

                if (0 == name_values.length) {
                    name_values[0] = {
                        'first': '',
                        'last': ''
                    }
                }
                return listInputTemplate({
                    'filedType': 'namelist',
                    'fieldName': field_name,
                    'inputForm': namelistInputTemplate({
                        'fieldValue': name_values
                    })
                })
                break
            case 'l_key':
            case 'l_literal':
                let literals = the_value.split('} and {')
                let literal_values = []
                for (let i = 0; i < literals.length; i++) {
                    literal_values[literal_values.length] = literals[i].replace('{',
                        '').replace('}', '')
                }
                if (0 == literal_values.length)
                    literal_values[0] = ''
                return listInputTemplate({
                    'filedType': 'literallist',
                    'fieldName': field_name,
                    'inputForm': literallistInputTemplate({
                        'fieldValue': literal_values
                    })
                })
            case 'f_key':
                if ('undefined' != typeof(form_info.localization)) {
                    let l_keys = _.select(LocalizationKeys, function(obj) {
                            return obj.type == form_info.localization
                        }),
                        key_options = [],
                        selected_value_title = ''
                    jQuery.each(l_keys, function() {
                        if (this.name == the_value) {
                            selected_value_title = this.title
                        }
                        key_options.push({
                            'value': this.name,
                            'title': this.title
                        })
                    })
                    return selectTemplate({
                        'fieldName': field_name,
                        'fieldTitle': selected_value_title,
                        'fieldValue': the_value,
                        'fieldDefault': {
                            'value': '',
                            'title': ''
                        },
                        'options': key_options
                    })
                } else {
                    // TODO: Check if we really want this template here.
                    return inputTemplate({
                        'fieldType': 'text',
                        'fieldName': field_name,
                        'fieldValue': the_value
                    })
                }
                break
            default:
                return inputTemplate({
                    'fieldType': 'text',
                    'fieldName': field_name,
                    'fieldValue': the_value
                })
        }
    }
}
