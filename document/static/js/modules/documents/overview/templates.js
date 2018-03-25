import {escapeText, localizeDate} from "../../common"

export let documentsListTemplate = ({documentList, user}) =>
    Object.values(documentList).map(doc =>
        documentsListItemTemplate({doc, user})
    ).join('')

/** A template for each document overview list item. */
export let documentsListItemTemplate = ({doc, user}) =>
    `<tr id="Text_${doc.id}" ${user.id === doc.owner.id ? 'class="owned-by-user"' : ''} >
        <td width="20">
            <span class="fw-inline">
                <input type="checkbox" class="entry-select"
                    data-id="${doc.id}"
                    data-owner="${doc.owner.id}"/>
            </span>
        </td>
        <td width="240">
            <span class="fw-document-table-title fw-inline">
                <i class="fa fa-file-text-o"></i>
                <a class="doc-title fw-link-text fw-searchable" href="/document/${doc.id}/">
                    ${doc.title.length ? doc.title : gettext('Untitled')}
                </a>
            </span>
        </td>
        <td width="140" class="td-icon">
            ${
                doc.revisions.length ?
                `<span class="fw-inline revisions" data-id="${doc.id}">
                    <i class="fa fa-clock-o"></i>
                </span>` :
                ''
            }
        </td>
        <td width="100">
            <span class="fw-inline">${localizeDate(doc.added*1000, 'sortable-date')}</span>
        </td>
        <td width="100">
            <span class="fw-inline">${localizeDate(doc.updated*1000, 'sortable-date')}</span>
        </td>
        <td width="200">
            <span>
                <img class="fw-avatar" src="${doc.owner.avatar}" />
            </span>
            <span class="fw-inline fw-searchable">${escapeText(doc.owner.name)}</span>
        </td>
        <td width="70"  class="td-icon">
            <span class="rights fw-inline" data-id="${doc.id}" title="${doc.rights}">
                <i data-id="${doc.id}" class="icon-access-right icon-access-${doc.rights}"></i>
            </span>
        </td>
         <td width="40"  class="td-icon">
            <span class="delete-document fw-inline fw-link-text" data-id="${doc.id}"
                    data-title="${escapeText(doc.title)}">
                ${
                    user.id === doc.owner.id ?
                    '<i class="fa fa-trash-o"></i>' :
                    ''
                }
            </span>
        </td>
    </tr>
    `

/** A template for the Fidus Writer document import dialog */
export let importFidusTemplate = () =>
    `<form id="import-fidus-form" method="post" enctype="multipart/form-data" class="ajax-upload">
            <input type="file" id="fidus-uploader" name="fidus" accept=".fidus" required />
            <button id="import-fidus-btn" class="fw-button fw-white fw-large">
                ${gettext('Select a file')}
            </button>
            <label id="import-fidus-name" class="ajax-upload-label"></label>
        </form>`
