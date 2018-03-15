import {addDropdownBox} from "../common"

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
        addDropdownBox(this, this.querySelector('.fw-pulldown'))
    })
    jQuery('.fw-bib-field-pulldown .fw-pulldown-item').bind('mousedown', function () {
        let selected_title = this.innerHTML,
            selected_value = jQuery(this).data('value')
        this.parentElement.parentElement.querySelector('.fw-pulldown-item.selected').classList.remove('selected')
        this.classList.add('selected')
        this.parentElement.parentElement.parentElement.parentElement.querySelector('label').innerHTML = selected_title
    })

    // init dropdown for date format pulldown
    jQuery('.fw-data-format-pulldown').each(function () {
        addDropdownBox(this, this.querySelector('.fw-pulldown'))
    })
    jQuery('.fw-data-format-pulldown .fw-pulldown-item').bind('mousedown', function () {
        let selected_title = this.innerHTML,
            selected_value = jQuery(this).data('value')
        this.parentElement.parentElement.querySelector('.fw-pulldown-item.selected').classList.remove('selected')
        this.classList.add('selected')
        this.parentElement.parentElement.parentElement.parentElement.querySelector('label').querySelector('span').innerHTML = `(${selected_title})`
        this.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.setAttribute('data-format', selected_value)
    })

    // nit dropdown for f_key selection
    jQuery('.fw-bib-select-pulldown').each(function () {
        addDropdownBox(this, this.querySelector('.fw-pulldown'))
    })
    jQuery('.fw-bib-select-pulldown .fw-pulldown-item').bind('mousedown', function () {
        let selected_title = this.innerHTML,
            selected_value = jQuery(this).data('value')
        this.parentElement.parentElement.querySelector('.fw-pulldown-item.selected').classList.remove('selected')
        this.classList.add('selected')
        this.parentElement.parentElement.parentElement.parentElement.querySelector('label').innerHTML = selected_title
    })
}


// Takes any richtext text field as used in bibliography and returns the text contents
export function litToText(litStringArray) {
    let outText = ''
    litStringArray.forEach((litString) => {
        if (litString.type==='text') {
            outText += litString.text
        }
    })
    return outText
}

export function nameToText(nameList) {
    let nameString = ''
    if (nameList.length===0) {
        return nameString
    }
    if (nameList[0]['family']) {
        nameString += litToText(nameList[0]['family'])
        if (nameList[0]['given']) {
            nameString += `, ${litToText(nameList[0]['given'])}`
        }
    } else if (nameList[0]['literal']){
        nameString += litToText(nameList[0]['literal'])
    }

    if (1 < nameList.length) {
        //if there are more authors, add "and others" behind.
        nameString += gettext(' and others')
    }

    return nameString
}
