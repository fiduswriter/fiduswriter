import {addDropdownBox} from "../common"

export let formatDateString = function(dateString) {
    // This mirrors the formatting of the date as returned by Python in bibliography/models.py
    if ('undefined' == typeof(dateString)) return ''
    let dates = dateString.split('/')
    let newValue = []
    for (let x = 0; x < dates.length; x++) {
        let dateParts = dates[x].split('-')
        newValue.push('')
        for (let i = 0; i < dateParts.length; i++) {
            if (isNaN(dateParts[i])) {
                break
            }
            if (i > 0) {
                newValue[x] += '/'
            }
            newValue[x] += dateParts[i]
        }
    }
    if (newValue[0] === '') {
        return ''
    } else if (newValue.length === 1) {
        return newValue[0]
    } else {
        return newValue[0] + '-' + newValue[1]
    }
}

/** Add and remove name list field.
 * @function addRemoveListHandler
 */
export let addRemoveListHandler = function () {
    jQuery('.fw-add-input').bind('click', function () {
        let $parent = jQuery(this).parents('.fw-list-input')
        if (0 === $parent.next().length) {
            let $parent_clone = $parent.clone(true)
            $parent_clone.find('input, select').val('').removeAttr(
                'data-id')
            $parent_clone.insertAfter($parent)
        } else {
            let $the_prev = jQuery(this).prev()
            if ($the_prev.hasClass("category-form")) {
                let this_id = $the_prev.attr('data-id')
                if ('undefined' != typeof (this_id)) {
                    // TODO: Figure out what this was about
                    //        bibliographyHelpers.deleted_cat[bibliographyHelpers.deleted_cat // KEEP
                //                .length] = this_id
                }

            }
            $parent.remove()
        }
    })

    // init dropdown for eitheror field names
    jQuery('.fw-bib-field-pulldown').each(function () {
        addDropdownBox(jQuery(this), jQuery(this).children('.fw-pulldown'))
    })
    jQuery('.fw-bib-field-pulldown .fw-pulldown-item').bind('mousedown', function () {
        let selected_title = jQuery(this).html(),
            selected_value = jQuery(this).data('value')
        jQuery(this).parent().parent().find('.fw-pulldown-item.selected').removeClass('selected')
        jQuery(this).addClass('selected')
        jQuery(this).parent().parent().parent().siblings('label').html(selected_title)
    })

    // init dropdown for date format pulldown
    jQuery('.fw-data-format-pulldown').each(function () {
        addDropdownBox(jQuery(this), jQuery(this).children('.fw-pulldown'))
    })
    jQuery('.fw-data-format-pulldown .fw-pulldown-item').bind('mousedown', function () {
        let selected_title = jQuery(this).html(),
            selected_value = jQuery(this).data('value')
        jQuery(this).parent().parent().find('.fw-pulldown-item.selected').removeClass('selected')
        jQuery(this).addClass('selected')
        jQuery(this).parent().parent().parent().siblings('label').children('span').html('(' + selected_title + ')')
        jQuery(this).parent().parent().parent().parent().parent().parent().attr('data-format', selected_value)
    })

    // nit dropdown for f_key selection
    jQuery('.fw-bib-select-pulldown').each(function () {
        addDropdownBox(jQuery(this), jQuery(this).children('.fw-pulldown'))
    })
    jQuery('.fw-bib-select-pulldown .fw-pulldown-item').bind('mousedown', function () {
        let selected_title = jQuery(this).html(),
            selected_value = jQuery(this).data('value')
        jQuery(this).parent().parent().find('.fw-pulldown-item.selected').removeClass('selected')
        jQuery(this).addClass('selected')
        jQuery(this).parent().parent().parent().siblings('label').html(selected_title)
    })

    jQuery('.dk').dropkick()
}

/** Dictionary of date selection options for bibliography item editor (localized).
 */
export const dateFormat = {
    'y': gettext('Year'),
    'y/y': gettext('Year - Year'),
    'my': gettext('Month/Year'),
    'my/my': gettext('M/Y - M/Y'),
    'mdy': gettext('Month/Day/Year'),
    'mdy/mdy': gettext('M/D/Y - M/D/Y')
}
