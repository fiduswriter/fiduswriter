import {processFidusFile} from "./process-file"

export let initZipFileRead = function (file) {

    zip.createReader(new zip.BlobReader(file), function (reader) {
        // get all entries from the zip

        reader.getEntries(function (entries) {

            if (entries.length) {

                let textFiles = [{
                        filename: 'mimetype'
                    }, {
                        filename: 'filetype-version'
                    }, {
                        filename: 'document.json'
                    }, {
                        filename: 'images.json'
                    }, {
                        filename: 'bibliography.json'
                    }
                ]

                let counter = 0

                function getEntry() {
                    if (counter < textFiles.length) {
                        _.findWhere(entries, textFiles[counter]).getData(
                            new zip.TextWriter(), function (text) {
                                textFiles[counter]['contents'] = text
                                counter++
                                getEntry()
                            })
                    } else {
                        processFidusFile(textFiles, entries)
                    }
                }

                getEntry()

            }
        })

    }, function (error) {
        // onerror callback
    })

}

export let init = function (file) { // use a BlobReader to read the zip from a Blob object
    let reader = new FileReader()
    reader.onloadend = function() {
        if (reader.result.length > 60 && reader.result.substring(0,2) == 'PK') {
            initZipFileRead(file)
        } else {
            // The file is not a Fidus Writer file.
            $.deactivateWait()
            $.addAlert('error', gettext('The uploaded file does not appear to be a Fidus Writer file.'))
            return
        }
    }
    reader.readAsText(file)
}
