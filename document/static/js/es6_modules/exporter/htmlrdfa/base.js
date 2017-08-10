import {BaseDOMExporter} from "../tools/dom-export"
import {RenderCitations} from "../../citations/render"
import {docSchema} from "../../schema/document"
import {DOMSerializer} from "prosemirror-model"

export class BaseHTMLExporter extends BaseDOMExporter {
    joinDocumentParts() {
        let serializer = DOMSerializer.fromSchema(docSchema)
        this.contents = serializer.serializeNode(docSchema.nodeFromJSON(this.doc.contents))

        // Remove hidden parts
        let hiddenEls = [].slice.call(this.contents.querySelectorAll('[data-hidden=true]'))
        hiddenEls.forEach(hiddenEl => {
            hiddenEl.parentElement.removeChild(hiddenEl)
        })

        let citRenderer = new RenderCitations(
            this.contents,
            this.doc.settings.citationstyle,
            this.bibDB,
            this.citationStyles,
            this.citationLocales,
            true
        )
        return citRenderer.init().then(
            () => {
                this.addBibliographyHTML(citRenderer.fm.bibHTML)
                this.contents = this.cleanHTML(this.contents)
                return Promise.resolve()
            }
        )
    }

    addBibliographyHTML(bibliographyHTML) {
        if (bibliographyHTML.length > 0) {
            let tempNode = document.createElement('div')
            tempNode.innerHTML = bibliographyHTML
            while (tempNode.firstChild) {
                this.contents.appendChild(tempNode.firstChild)
            }
        }
    }

    addFigureNumbers(htmlCode) {

        jQuery(htmlCode).find('figcaption .figure-cat-figure').each(
            function(index) {
                this.innerHTML += ' ' + (index + 1) + ': '
            })

        jQuery(htmlCode).find('figcaption .figure-cat-photo').each(function(
            index) {
            this.innerHTML += ' ' + (index + 1) + ': '
        })

        jQuery(htmlCode).find('figcaption .figure-cat-table').each(function(
            index) {
            this.innerHTML += ' ' + (index + 1) + ': '
        })
        return htmlCode

    }


    converTitleToRDFa(htmlCode){
          
          jQuery(htmlCode).find('div.article-title').attr({"property": "schema:name" })
	  var titleTag=  jQuery(htmlCode).find('div.article-title').wrap('<p/>').parent().html()
	  titleTag = titleTag
	 			.replace(/<div/g, '<h1')
	  			.replace(/<\/div>/g, '</h1>')
	  jQuery(htmlCode).find('div.article-title').html(titleTag)
	  jQuery(htmlCode).find('h1.article-title').unwrap()


	  return htmlCode
    }

    converAuthorsToRDFa(htmlCode){
          
          jQuery(htmlCode).find('div.article-authors').attr({"id": "authors" })
	  return htmlCode
    }

    convertAbstractToRDF(htmlCode){
    //jQuery(htmlCode).find('div.article-abstract').parent().before('<div calss="article-content" id="content">')
          jQuery(htmlCode).find('div.article-abstract')
	  .attr({"datatype": "rdf:HTML",
		 "property" : "schema:abstract"
	  })
          var abstractSection =  jQuery(htmlCode).find('div.article-abstract').wrap('<p/>').parent().html()
	  abstractSection =  abstractSection
 				//.replace(/<div/g,'<div calss="article-content" id="content"> <section id="abstract"> <div')
				.replace(/<div/g,'<section id="Abstract"')
 				.replace(/<\/div>/g, '</section>')
	  jQuery(htmlCode).find('div.article-abstract').parent().html(abstractSection) 
	  jQuery(htmlCode).find('div.article-abstract').unwrap()
	  jQuery(htmlCode).find('div.article-content').unwrap()
  	  return htmlCode
   } 
   

	addSectionsTag(htmlCode){
	 var className
	 console.log(jQuery(htmlCode).find('div.article-content').html())
         jQuery(htmlCode).find('h2').each(function(
            index) {
		if(!(this.classList == null) && !(this.innerHTML == null)){
			className = this.innerHTML
			className = className.replace(/\s+/g, '')
			console.log(className)
			this.classList.add( className )
			this.id = className
	         	this.outerHTML = '<section id="' + className  + '" resource="#' + className  +'"> <h2 property="schema:name">'+ this.innerHTML + '</h2></sectionh>'
			console.log(this.outerHTML)
	       } 
	 })
         return htmlCode
	}

    replaceImgSrc(htmlString) {
        htmlString = htmlString.replace(/<(img|IMG) data-src([^>]+)>/gm,
            "<$1 src$2>")
        return htmlString
    }
}
