
/* Functions related to taking document data from this.mod.editor.doc.* and displaying
 * it (ie making it part of the DOM structure).
 */
export class ModSettingsLayout {
    constructor(mod) {
        mod.layout = this
        this.mod = mod
    }

    /** Layout metadata and then mark the document as having changed.
     */
    setMetadataDisplay() {
        this.layoutMetadata()
        this.mod.editor.docInfo.changed = true
    }

    /** Display the document style.
     */
    displayDocumentstyle() {

        let documentStyleLink, stylesheet, that = this

        jQuery("#header-navigation .style.selected").removeClass('selected')
        jQuery('span[data-style=' + this.mod.editor.doc.settings.documentstyle + ']').addClass('selected')

        documentStyleLink = document.getElementById('document-style-link')

        // Remove previous style.
        documentStyleLink.parentElement.removeChild(documentStyleLink.previousElementSibling)

        stylesheet = loadCSS(staticUrl + 'css/document/' + this.mod.editor.doc.settings.documentstyle + '.css', documentStyleLink)

        onloadCSS(stylesheet, function() {
            // We layout the comments 100 ms after the stylesheet has been loaded.
            // This should usually be enough to make the layout work correctly.
            //
            // TODO: Find a way that is more reliable than a timeout to check
            // for font loading.
            setTimeout(function() {
                that.mod.editor.mod.comments.layout.layoutComments()

              //  that.mod.editor.mod.footnotes.layout.layoutFootnotes()
            }, 500)
        })

    }

    /** Display the citation style.
     */
    displayCitationstyle() {
        jQuery("#header-navigation .citationstyle.selected").removeClass(
            'selected')
        jQuery('span[data-citationstyle=' + this.mod.editor.doc.settings.citationstyle + ']').addClass(
            'selected')
        this.mod.editor.layoutCitations()
    }

    /** Display the document's paper size.
     */
    displayPapersize() {
        jQuery("#header-navigation .papersize.selected").removeClass(
            'selected')
        jQuery('span[data-paperheight=' + this.mod.editor.doc.settings.papersize +
            ']').addClass('selected')
        paginationConfig['pageHeight'] = this.mod.editor.doc.settings.papersize
    }


    layoutMetadata() {
        let metadataCss = ''
        let metadataItems = ['subtitle', 'abstract', 'authors', 'keywords']
        let that = this

        metadataItems.forEach(function(metadataItem) {
            if (!that.mod.editor.doc.settings['metadata-' + metadataItem]) {
                metadataCss += '#metadata-' + metadataItem + ' {display: none;}\n'
            } else {
                metadataCss += 'span.metadata-' + metadataItem + ' {background-color: black; color: white;}\n'
            }
        })

        jQuery('#metadata-styles')[0].innerHTML = metadataCss

    }

}
