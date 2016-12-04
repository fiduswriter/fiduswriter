export let BibFieldTitles = {
    'abstract': gettext('Abstract'),
    'addendum': gettext('Addendum'),
    'afterword': gettext('Afterword'),
    'annotation': gettext('Annotation'),
    'annotator': gettext('Annotations author(s)'),
    'author': gettext('Author(s)'),
    'authortype': gettext('Author type'),
    'bookauthor': gettext('Book author(s)'),
    'bookpagination': gettext('Book pagination'),
    'booksubtitle': gettext('Book subtitle'),
    'booktitle': gettext('Book title'),
    'booktitleaddon': gettext('Book title annex'),
    'chapter': gettext('Chapter or section'),
    'commentator': gettext('Author(s) of a commentary'),
    'date': gettext('Publication date'),
    'doi': gettext('Digital Object Identifier'),
    'edition': gettext('Edition'),
    'editor': gettext('Editor(s)'),
    'editora': gettext('Secondary editor'),
    'editorb': gettext('Secondary editor 2'),
    'editorc': gettext('Secondary editor 3'),
    'editortype': gettext('Role of editor(s)'),
    'editoratype': gettext('Role of secondary editor'),
    'editorbtype': gettext('Role of secondary editor 2'),
    'editorctype': gettext('Role of secondary editor 3'),
    'eid': gettext('Electronic identifier of an article'),
    'entrysubtype': gettext('Entry subtype'),
    'eprint': gettext('Electronic identifier of an online publication'),
    'eprintclass': gettext('Additional information to an online publication'),
    'eprinttype': gettext('Eprint identifier type'),
    'eventdate': gettext('Event date'),
    'eventtitle': gettext('Event title'),
    'file': gettext('Local link to the work'),
    'foreword': gettext('Foreword author(s)'),
    'holder': gettext('Patent holder(s)'),
    'howpublished': gettext('Publication notice'),
    'indextitle': gettext('Title for indexing'),
    'institution': gettext('Institution'),
    'introduction': gettext('Author(s) of an introduction to the work'),
    'isan': gettext('ISAN'),
    'isbn': gettext('ISBN'),
    'ismn': gettext('ISMN'),
    'isrn': gettext('ISRN'),
    'issn': gettext('ISSN'),
    'issue': gettext('Issue'),
    'issuesubtitle': gettext('Issue subtitle'),
    'issuetitle': gettext('Issue title'),
    'iswc': gettext('ISWC'),
    'journalsubtitle': gettext('Subtitle of publication'),
    'journaltitle': gettext('Title of publication'),
    'keywords': gettext('Keywords'),
    'label': gettext('Label'),
    'language': gettext('Language(s)'),
    'library': gettext('Library information'),
    'location': gettext('Location(s) of publication'),
    'mainsubtitle': gettext('Main subtitle'),
    'maintitle': gettext('Maintitle'),
    'maintitleaddon': gettext('Annex to the maintitle'),
    'nameaddon': gettext('author name addon'),
    'note': gettext('Note'),
    'number': gettext('Number of the work in a series'),
    'organization': gettext('Organization(s)'),
    'origdate': gettext('Publication date of the original work'),
    'origlanguage': gettext('Language of the original work'),
    'origlocation': gettext('Publication location of the original edition'),
    'origpublisher': gettext('Publisher of the original edition'),
    'origtitle': gettext('Title of the original work'),
    'pages': gettext('Page numbers or page ranges'),
    'pagetotal': gettext('Total number of pages'),
    'pagination': gettext('Pagination'),
    'part': gettext('Number of a partial volume'),
    'publisher': gettext('Publisher(s)'),
    'pubstate': gettext('Publication state of the work'),
    'reprinttitle': gettext('Title of reprint'),
    'series': gettext('Name of series'),
    'shortauthor': gettext('Abbreviated author(s)'),
    'shorteditor': gettext('Abbreviated editor(s)'),
    'shorthand': gettext('Shorthand'),
    'shorthandintro': gettext('Shorthand intro'),
    'shortjournal': gettext('Acronym of the publication\'s title'),
    'shortseries': gettext('Acronym of the series'),
    'shorttitle': gettext('Abridged title'),
    'subtitle': gettext('Subtitle'),
    'title': gettext('Title'),
    'titleaddon': gettext('Title addon'),
    'translator': gettext('Translator(s)'),
    'type': gettext('Manual type'),
    'url': gettext('URL'),
    'urldate': gettext('Access date'),
    'venue': gettext('Location of a conference'),
    'version': gettext('Version'),
    'volume': gettext('Volume'),
    'volumes': gettext('Total number of volumes')
}

export let BibTypeTitles = {
        'article': gettext('Article'),
        'book': gettext('Book'),
        'mvbook': gettext('Multi-volume book'),
        'inbook': gettext('In book'),
        'bookinbook': gettext('Book in book'),
        'suppbook': gettext('Supplemental material in a book'),
        'booklet': gettext('Booklet'),
        'collection': gettext('Collection'),
        'mvcollection': gettext('Multi-volume collection'),
        'incollection': gettext('In collection'),
        'suppcollection': gettext('Supplemental material in a collection'),
        'manual': gettext('Manual'),
        'misc': gettext('Miscellany'),
        'online': gettext('Online resource'),
        'patent': gettext('Patent'),
        'periodical': gettext('Periodical'),
        'suppperiodical': gettext('Supplemental material in a periodical'),
        'proceedings': gettext('Proceedings'),
        'mvproceedings': gettext('Multi-volume proceedings'),
        'inproceedings': gettext('Article in a proceedings'),
        'reference': gettext('Reference'),
        'mvreference': gettext('Multi-volume work of reference'),
        'inreference': gettext('Article in a work of reference'),
        'report': gettext('Report'),
        'thesis': gettext('Thesis'),
        'unpublished': gettext('Unpublished'),
        'article-magazine': gettext('Magazine article'),
        'article-newspaper': gettext('Newspaper article'),
        'article-journal': gettext('Journal article'),
        'entry-encyclopedia': gettext('Encyclopedia entry'),
        'entry-dictionary': gettext('Dictionary entry'),
        'post-weblog': gettext('Blog post'),
        'post': gettext('Forum post')
    }

/** A list of all the bibliography keys and their full name. */
export let LocalizationKeys = [
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
}, {
    type: 'types',
    name: 'software',
    title: 'computer\ software'
}]
