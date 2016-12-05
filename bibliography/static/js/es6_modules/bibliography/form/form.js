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
    BibTypes, BibFieldTypes
} from "biblatex-csl-converter"

import {
    BibTypeTitles, BibFieldTitles
} from "./titles"

import {addDropdownBox, setCheckableLabel} from "../../common/common"

/** A list of all the bibliography keys and their full name. */
let LocalizationKeys = [
    {
    type: 'publication_state',
    name: 'inpreparation',
    title: 'in\ preparation'
}, {
    type: 'publication_state',
    name: 'submitted',
    title: 'submitted\ to\ a\ journal\ or\ conference'
}, {
    type: 'publication_state',
    name: 'forthcoming',
    title: 'forthcoming'
}, {
    type: 'publication_state',
    name: 'inpress',
    title: 'in\ press'
}, {
    type: 'publication_state',
    name: 'prepublished',
    title: 'pre\-published'
}, {
    type: 'pagination',
    name: 'page',
    title: 'page'
}, {
    type: 'pagination',
    name: 'column',
    title: 'column'
}, {
    type: 'pagination',
    name: 'section',
    title: 'section'
}, {
    type: 'pagination',
    name: 'paragraph',
    title: 'paragraph'
}, {
    type: 'pagination',
    name: 'verse',
    title: 'verse'
}, {
    type: 'pagination',
    name: 'line',
    title: 'line'
}, {
    type: 'types',
    name: 'mathesis',
    title: 'master\’s\ thesis'
}, {
    type: 'types',
    name: 'phdthesis',
    title: 'PhD\ thesis'
}, {
    type: 'types',
    name: 'candthesis',
    title: 'Candidate\ thesis'
}, {
    type: 'types',
    name: 'techreport',
    title: 'technical\ report'
}, {
    type: 'types',
    name: 'resreport',
    title: 'research\ report'
}, {
    type: 'types',
    name: 'software',
    title: 'computer\ software'
}, {
    type: 'types',
    name: 'datacd',
    title: 'data\ cd'
}, {
    type: 'types',
    name: 'audiocd',
    title: 'audio\ cd'
}]


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
            let entryType = BibTypes[type]
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
        if ('' === type || typeof(type) === 'undefined') {
            typeTitle = gettext('Select source type')
        } else {
            typeTitle = BibTypeTitles[type]
        }

        let sourType = sourcetypeTemplate({
            fieldTitle: typeTitle,
            fieldName: 'entrytype',
            fieldValue: type,
            options: BibTypes,
            titles: BibTypeTitles
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
        addDropdownBox(jQuery('#source-type-selection'), jQuery('#source-type-selection > .fw-pulldown'))
        jQuery('#source-type-selection .fw-pulldown-item').bind('click', function() {
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
            if ('' !== thisVal) {
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
        if ('' === jQuery('#id_entrytype').val())
            jQuery('#bookoptionsTab').hide()
        jQuery('.fw-checkable-label').bind('click', function() {
            setCheckableLabel(jQuery(this))
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
        if (null === eitheror || undefined === eitheror) {
            eitheror = []
        }
        let ret = ''
        let eitheror_fields = [],
            theValue

        jQuery.each(fields, function() {
            //if the fieldtype must be "either or", then save it in the array
            if (0 === id) {
                theValue = ''
            } else {
                theValue = that.bibDB[id][this]
                if ('undefined' === typeof(theValue)) {
                    theValue = ''
                }
            }
            //get html with template function of underscore.js
            if ('f_date' == BibFieldTypes[this].type) {
                let date_form_html = that.getFormPart(BibFieldTypes[this], this, theValue),
                    date_format = date_form_html[1]
                ret += dateinputTrTemplate({
                    'fieldTitle': BibFieldTitles[this],
                    'format': date_format,
                    'inputForm': date_form_html[0],
                    dateFormat
                })
            } else {
                ret += inputTrTemplate({
                    'fieldTitle': BibFieldTitles[this],
                    'inputForm': that.getFormPart(BibFieldTypes[this], this, theValue)
                })
            }
        })

        if (1 < eitheror.length) {
            let selected = eitheror[0]
            eitheror.forEach(function(field) {
                //if the field has value, get html with template function of underscore.js
                if (0 !== id) {

                    let current_val = that.bibDB[id][field]
                    if (null !== current_val && 'undefined' !== typeof(current_val) && '' !== current_val) {
                        selected = field
                        return false
                    }
                }
            })

            if (0 === id) {
                theValue = ''
            } else {
                theValue = that.bibDB[id][selected]
                if ('undefined' === typeof(theValue)) {
                    theValue = ''
                }
            }

            ret = eitherorTrTemplate({
                'fields': eitheror,
                'BibFieldTitles': BibFieldTitles,
                'selected': selected,
                'inputForm': that.getFormPart(BibFieldTypes[selected], selected, theValue)
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
        let entryType = BibTypes[type]

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

    getEntryCat() {
        let entryCats = []
        jQuery('.entry-cat').each(function() {
            let $this = jQuery(this)
            if ($this.prop("checked")) {
                entryCats.push($this.val())
            }
        })
        return entryCats.join(',')
    }

    getBibType() {
        return jQuery('#id_entrytype').val()
    }

    /** Handles the submission of the bibliography entry form.
     * @function onCreateBibEntrySubmitHandler
     * @param id The id of the bibliography item.
     */
    onCreateBibEntrySubmitHandler(id) {
        //when submitted, the values in form elements will be restored
        let formValues = {
            'id': id,
            'bib_type': this.getBibType(),
            'entry_cat': this.getEntryCat(),
            'fields': {},
        }

        jQuery('.entryForm').each(function() {
            let $this = jQuery(this)
            let theName = $this.attr('name') || $this.attr('data-field-name')
            let bibFieldType = BibFieldTypes[theName]
            let theOtherType = $this.attr('type') || $this.attr('data-type')
            let theValue = ''
            let isMust = (1 == $this.parents('#optionTab1').length)
            let eitheror = $this.parents('.eitheror')
            if (1 == eitheror.length) {
                //if it is a either-or-field
                let fieldNames = eitheror.find('.field-names .fw-pulldown-item')
                fieldNames.each(function() {
                    if (jQuery(this).hasClass('selected')) {
                        theName = jQuery(this).data('value')
                    } else {
                        formValues.fields[jQuery(this).data('value')] = ''
                    }
                })
            }
            dataTypeSwitch: switch (bibFieldType.type) {
                case 'f_key':
                    if (bibFieldType.localization) {
                        let selected_key_item = $this.find('.fw-pulldown-item.selected')
                        if (0 === selected_key_item.length) {
                            selected_key_item = $this.find('.fw-pulldown-item:eq(0)')
                        }
                        theValue = selected_key_item.data('value')
                    } else {
                        theValue = $this.val().replace(/(^\s+)|(\s+$)/g, "")
                    }
                    break
                case 'f_date':
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
                        len

                    switch (date_format) {
                        case 'y':
                            required_values = required_dates = [y_val]
                            date_form = 'Y-AA-AA'
                            break
                        case 'my':
                            required_values = [y_val, m_val]
                            required_dates = [`${y_val}/${m_val}`]
                            date_form = 'Y-m-AA'
                            break
                        case 'mdy':
                            required_values = [y_val, m_val, d_val]
                            required_dates = [`${y_val}/${m_val}/${d_val}`]
                            date_form = 'Y-m-d'
                            break
                        case 'y/y':
                            required_values = required_dates = [y_val, y2_val]
                            date_form = 'Y-AA-AA/Y2-AA-AA'
                            break
                        case 'my/my':
                            required_values = [y_val, y2_val, m_val, m2_val]
                            required_dates = [`${y_val}/${m_val}`, `${y2_val}/${m2_val}`]
                            date_form = 'Y-m-AA/Y2-m2-AA'
                            break
                        case 'mdy/mdy':
                            required_values = [y_val, m_val, d_val, y2_val, m2_val, d2_val]
                            required_dates = [
                                `${y_val}/${m_val}/${d_val}`,
                                `${y2_val}/${m2_val}/${d2_val}`
                            ]
                            date_form = 'Y-m-d/Y2-m2-d2'
                            break
                    }

                    len = required_values.length
                    for (let i = 0; i < len; i++) {
                        if ('undefined' === typeof(required_values[i]) ||
                            null === required_values[i] ||
                            '' === required_values[i]) {
                            theValue = ''
                            break dataTypeSwitch
                        }
                    }

                    len = required_dates.length
                    for (let i = 0; i < len; i++) {
                        let date_obj = new Date(required_dates[i])
                        if ('Invalid Date' == date_obj) {
                            theValue = ''
                            break dataTypeSwitch
                        }
                        date_objs.push(date_obj)
                    }

                    date_form = date_form.replace('d', date_objs[0].getDate())
                    date_form = date_form.replace('m', date_objs[0].getMonth() + 1)
                    date_form = date_form.replace('Y', date_objs[0].getFullYear())

                    if (2 == date_objs.length) {
                        date_form = date_form.replace('d2', date_objs[1].getDate())
                        date_form = date_form.replace('m2', date_objs[1].getMonth() + 1)
                        date_form = date_form.replace('Y2', date_objs[1].getFullYear())
                    }

                    theValue = date_form
                    break
                case 'l_name':
                    theValue = []
                    $this.find('.fw-list-input').each(function() {
                        let $tr = jQuery(this)
                        let first_name = jQuery.trim($tr.find(
                            '.fw-name-input.fw-first').val())
                        let last_name = jQuery.trim($tr.find(
                            '.fw-name-input.fw-last').val())
                        let full_name = ''
                        if ('' === first_name && '' === last_name) {
                            return true
                        } else if ('' === last_name) {
                            full_name = '{' + first_name + '}'
                        } else if ('' === first_name) {
                            full_name = '{' + last_name + '}'
                        } else {
                            full_name = '{' + first_name + '} {' + last_name + '}'
                        }
                        theValue[theValue.length] = full_name
                    })
                    // list to string
                    theValue = theValue.join(' and ')
                    break
                case 'l_literal':
                    theValue = []
                    $this.find('.fw-list-input').each(function() {
                        let inputVal = jQuery.trim(jQuery(this).find('.fw-input').val())
                        if ('' === inputVal) return true
                        theValue.push('{' + inputVal + '}')
                    })
                    // list to string
                    theValue = theValue.join(' and ')
                    break
                case 'f_integer':
                    theValue = parseInt($this.val().replace(/(^\s+)|(\s+$)/g, ""))
                    if (window.isNaN(theValue)) {
                        theValue = ''
                    }
                    break
                /*case 'checkbox':
                    //if it is a checkbox, the value will be restored as an Array
                    if (undefined === formValues.fields[theName]) formValues.fields[theName] = []
                    if ($this.prop("checked")) {
                        formValues.fields[theName][formValues.fields[theName].length] = $this.val()
                    }
                    break*/
                default:
                    theValue = $this.val().replace(/(^\s+)|(\s+$)/g, "")
            }

            if (isMust && (undefined === theValue || '' === theValue)) {
                theValue = 'null'
            }
            if (isMust || '' !== theValue) {
                formValues.fields[theName] = theValue
            }
        })
        this.callback(formValues)
        jQuery('#createbook .warning').detach()
        jQuery("#createbook").dialog('close')
    }

    /** Recover the current value of a certain field in the bibliography item form.
     * @function getFormPart
     * @param formInfo Information about the field -- such as it's type (date, text string, etc.)
     * @param fieldName The id specifying the field.
     * @param theValue The current value of the field.
     */
    getFormPart(formInfo, fieldName, theValue) {
        switch (formInfo.type) {
            case 'f_date':
                theValue = formatDateString(theValue)
                let dates = theValue.split('-'),
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
                        'fieldName': fieldName,
                        'dateSelect': dateselectTemplate({
                            'type': 'date',
                            'formname': 'date' + fieldName,
                            'value': d_val[0]
                        }),
                        'monthSelect': dateselectTemplate({
                            'type': 'month',
                            'formname': 'month' + fieldName,
                            'value': m_val[0]
                        }),
                        'yearSelect': dateselectTemplate({
                            'type': 'year',
                            'formname': 'year' + fieldName,
                            'value': y_val[0]
                        }),
                        'date2Select': dateselectTemplate({
                            'type': 'date2',
                            'formname': 'date2' + fieldName,
                            'value': d_val[1]
                        }),
                        'month2Select': dateselectTemplate({
                            'type': 'month2',
                            'formname': 'month2' + fieldName,
                            'value': m_val[1]
                        }),
                        'year2Select': dateselectTemplate({
                            'type': 'year2',
                            'formname': 'year2' + fieldName,
                            'value': y_val[1]
                        })
                    }),
                    date_format
                ]
                break
            case 'l_name':
                let names = theValue.split('} and {'),
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

                if (0 === name_values.length) {
                    name_values[0] = {
                        'first': '',
                        'last': ''
                    }
                }
                return listInputTemplate({
                    'filedType': 'namelist',
                    'fieldName': fieldName,
                    'inputForm': namelistInputTemplate({
                        'fieldValue': name_values
                    })
                })
                break
            case 'l_key':
            case 'l_literal':
                let literals = theValue.split('} and {')
                let literal_values = []
                for (let i = 0; i < literals.length; i++) {
                    literal_values[literal_values.length] = literals[i].replace('{',
                        '').replace('}', '')
                }
                if (0 === literal_values.length)
                    literal_values[0] = ''
                return listInputTemplate({
                    'filedType': 'literallist',
                    'fieldName': fieldName,
                    'inputForm': literallistInputTemplate({
                        'fieldValue': literal_values
                    })
                })
            case 'f_key':
                if ('undefined' != typeof(formInfo.localization)) {
                    let l_keys = _.select(LocalizationKeys, function(obj) {
                            return obj.type == formInfo.localization
                        }),
                        key_options = [],
                        selected_value_title = ''
                    jQuery.each(l_keys, function() {
                        if (this.name == theValue) {
                            selected_value_title = this.title
                        }
                        key_options.push({
                            'value': this.name,
                            'title': this.title
                        })
                    })
                    return selectTemplate({
                        'fieldName': fieldName,
                        'fieldTitle': selected_value_title,
                        'fieldValue': theValue,
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
                        'fieldName': fieldName,
                        'fieldValue': theValue
                    })
                }
                break
            default:
                return inputTemplate({
                    'fieldType': 'text',
                    'fieldName': fieldName,
                    'fieldValue': theValue
                })
        }
    }
}
