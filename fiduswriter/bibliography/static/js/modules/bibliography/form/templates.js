/** A template for the bibliography item edit dialog. */
import {DialogTabs} from "fwtoolkit"
import {getAllTypeTitles} from "./strings"

const requiredFieldsTemplate = () =>
    `<div id="req-fields-tab">
        <table class="fw-dialog-table"><tbody id="eo-fields"></tbody></table>
        <table class="fw-dialog-table"><tbody id="req-fields"></tbody></table>
    </div>`

const optionalFieldsTemplate = () =>
    `<div id="opt-fields-tab">
        <table class="fw-dialog-table"><tbody id="opt-fields"></tbody></table>
    </div>`

const categoriesTemplate = () =>
    `<div id="categories-tab">
        <table class="fw-dialog-table">
            <tbody>
                <tr>
                    <th><h4 class="fw-tablerow-title">${gettext("Categories")}</h4></th>
                    <td id="categories-field"></td>
                </tr>
            </tbody>
        </table>
    </div>`

export const bibDialog = ({bib_type, BibTypes, hasCats}) => {
    const typeTitles = getAllTypeTitles()
    const tabs = [
        {
            title: gettext("Required Fields"),
            template: requiredFieldsTemplate
        },
        {
            title: gettext("Optional Fields"),
            template: optionalFieldsTemplate
        }
    ]
    if (hasCats) {
        tabs.push({
            title: gettext("Categories"),
            template: categoriesTemplate
        })
    }
    const dialogTabs = new DialogTabs(tabs, {containerId: "bib-dialog-tabs"})
    return `<div class="bib-dialog-header">
            <div class="fw-select-container">
                <select id="select-bibtype" class="fw-button fw-light fw-large" required>
                    ${
                        bib_type === false
                            ? `<option class="placeholder" selected disabled value="">${gettext("Select source type")}</option>`
                            : ""
                    }
                    ${Object.keys(BibTypes)
                        .map(
                            key =>
                                `<option value="${key}"
                                    ${key === bib_type ? "selected" : ""}>
                                ${typeTitles[key]}
                            </option>`
                        )
                        .join("")}
                </select>
                <div class="fw-select-arrow fa fa-caret-down"></div>
            </div>
            <div class="entry-key-input-container">
                <input type="text" id="entry-key" class="fw-button fw-light" value="" placeholder="${gettext("Citation key")}" />
                <div id="entry-key-warning" class="entry-key-warning"></div>
            </div>
        </div>
        ${dialogTabs.render()}`
}
