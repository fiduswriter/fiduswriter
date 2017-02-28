import download from "downloadjs"



export let PDFFileCreator = function(latexCode, bibfile, ImagesList,externalClass, title) {
    compile(latexCode, bibfile, ImagesList, externalClass, title);
    }

var appendOutput = function(msg) {
        console.log(msg);
      }

function dataURItoBlob(dataURI) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    var byteString;
    if (dataURI.split(',')[0].indexOf('base64') >= 0)
        byteString = atob(dataURI.split(',')[1]);
    else
        byteString = unescape(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to a typed array
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ia], {type:mimeString});
}
function add_bibtex(pdftex){
    pdftex.FS_createLazyFile('/', 'etoolbox.sty', 'etoolbox.sty', true, true);
    pdftex.FS_createLazyFile('/', 'logreq.sty', 'logreq.sty', true, true);
    pdftex.FS_createLazyFile('/', 'logreq.def', 'logreq.def', true, true);
    pdftex.FS_createLazyFile('/', 'xstring.sty', 'xstring.sty', true, true);
    pdftex.FS_createLazyFile('/', 'xstring.tex', 'xstring.tex', true, true);

}
var compile = function(source_code, bibfile, ImagesList, externalClass, pdfFiletitle) {
    
        var pdf_dataurl = undefined;

        var pdftex = new PDFTeX("/static/js/libs/texlive/pdftex-worker.js");

    pdftex.set_TOTAL_MEMORY("-s").then(function() {
            pdftex.on_stdout = appendOutput;
            pdftex.on_stderr = appendOutput;
            if(externalClass){
                pdftex.FS_createPath('/', 'class', /*canRead=*/true, /*canWrite=*/true).then(function() {
                    pdftex.FS_createLazyFile('/class', externalClass.split('/')[4], externalClass, true, true);
                    pdftex.FS_createPath('/', 'images', /*canRead=*/true, /*canWrite=*/true).then(function() {
                        for (let i = 0; i < ImagesList.length; i++) {
                            pdftex.FS_createLazyFile('/images', ImagesList[i].filename, ImagesList[i].url, true, true);
                        }
                     //   pdftex.FS_createLazyFile('/', 'comment.sty', 'comment.sty', true, true);
                     //   pdftex.FS_createLazyFile('/', 'acmcopyright.sty', 'acmcopyright.sty', true, true);
                     //   pdftex.FS_createLazyFile('/', 'xkeyval.sty', 'xkeyval.sty', true, true);
                        console.log("compile")
                        pdftex.compile(source_code).then(function(pdf_dataurl) {
                           download(dataURItoBlob(pdf_dataurl),pdfFiletitle,'application/pdf')
                        });
                    });

                });
            }else{
                pdftex.FS_createPath('/', 'images', /*canRead=*/true, /*canWrite=*/true).then(function() {
                    for (let i = 0; i < ImagesList.length; i++) {
                        pdftex.FS_createLazyFile('/images', ImagesList[i].filename, ImagesList[i].url, true, true);
                    }
                    pdftex.FS_createLazyFile('/', 'luainputenc.sty', 'luainputenc.sty', true, true);
                   //Adding requirements for Bibtex
                    if(bibfile.length  > 1){
                    	add_bibtex(pdftex)
                        bibfile.forEach(textFile => {
                            if(textFile.filename.includes(".bib")){
                            pdftex.FS_createDataFile('/',textFile.filename, textFile.contents,true,true)
                        }

                        })
                    }

                    pdftex.compile(source_code).then(function(pdf_dataurl) {
                       download(dataURItoBlob(pdf_dataurl),pdfFiletitle+'.pdf','application/pdf')
                    });
                });
            }
        });
      }
