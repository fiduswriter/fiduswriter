import {BaseDOMExporter} from "../tools/dom-export"
import {RenderCitations} from "../../citations/render"
import {docSchema} from "../../schema/document"
import {DOMSerializer} from "prosemirror-model"

export class BaseHTMLRDFaExporter extends BaseDOMExporter {
    joinDocumentParts() {
        let schema = docSchema
        schema.cached.imageDB = this.imageDB
        let serializer = DOMSerializer.fromSchema(schema)
        this.contents = serializer.serializeNode(docSchema.nodeFromJSON(
            this.doc.contents))
        // Remove hidden parts
        let hiddenEls = [].slice.call(this.contents.querySelectorAll(
            '[data-hidden=true]'))
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

    addFigureNumbers(dom) {

        jQuery(dom).find('figcaption .figure-cat-figure').each(
            function(index) {
                this.innerHTML += ' ' + (index + 1) + ': '
            })

        jQuery(dom).find('figcaption .figure-cat-photo').each(function(index) {
            this.innerHTML += ' ' + (index + 1) + ': '
        })

        jQuery(dom).find('figcaption .figure-cat-table').each(function(index) {
            this.innerHTML += ' ' + (index + 1) + ': '
        })
        return dom

    }


    converTitleToRDFa(dom) {

        jQuery(dom).find('div.article-title').attr({
            "property": "schema:name"
        })
        var titleTag = jQuery(dom).find('div.article-title').wrap(
            '<p/>').parent().html()
        titleTag = titleTag
            .replace(/<div/g, '<h1')
            .replace(/<\/div>/g, '</h1>')
        jQuery(dom).find('div.article-title').html(titleTag)
        jQuery(dom).find('h1.article-title').unwrap()


        return dom
    }

    convertCommentsToRDFa(htmlCode) {

       jQuery(htmlCode).find('span.comment').each(function() {
            let id = jQuery(this).attr('data-id')
            jQuery(this).attr({"rel": "schema:hasPart", "typeof": "dctypes:Text", "resource": "r-" + id})
            let commentDescription = this.innerHTML,
                commentTag = '<mark id="' + id + '" property="schema:description">' + commentDescription + '</mark>',
                suppTag = '<sup class="ref-annotation">\
    		<a rel="cito:hasReplyFrom" href="#' + id + '" resource="' + window.location.href + '/comment-' + id + '">\
       		💬</a></sup>'
            jQuery(this).html(commentTag + suppTag)
            jQuery(this).addClass("ref do")

        })
        return htmlCode
    }

    createComment(commentNode){
    let commentHeader = '<!DOCTYPE html><html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en" lang="en"><head>\
    	<meta http-equiv="content-type" content="text/html; charset=UTF-8">\<meta charset="utf-8">\
    	<title>' + window.location.href + '#' + commentNode.id + '</title></head><body><main>\
    	<article id="' + commentNode.id + '" about="i:" typeof="oa:Annotation" prefix="rdf: http://www.w3.org/1999/02/22-rdf-syntax-ns# schema: http://schema.org/ dcterms: http://purl.org/dc/terms/ oa: http://www.w3.org/ns/oa# as: https://www.w3.org/ns/activitystreams#\
    	 i: ' + window.location.href + '#' + commentNode.id + '">',
            commentBody = '<h1 property="schema:name">' + commentNode.userName + '   <span rel="oa:motivatedBy" resource="oa:replying">replies</span></h1>\
    	<dl class="author-name"><dt>Authors</dt><dd><span rel="schema:creator"><span about="userURI#' + commentNode.user + '" typeof="schema:Person">\
    	<img alt="" rel="schema:image" src="' + commentNode.userAvatar + '" width="48" height="48"> <a href="#">\
    	<span about="userURI#' + commentNode.user + '" property="schema:name">' + commentNode.userName + '</span></a></span></span></dd></dl>\
    	<dl class="published"><dt>Published</dt><dd><a href="' + window.location.href + '#' + commentNode.id + '"><time datetime="' + commentNode.date + '" datatype="xsd:dateTime" property="schema:datePublished" content="' + commentNode.date + '">' + commentNode.date + '</time></a></dd>\
    	<section id="comment-' + commentNode.id + '" rel="oa:hasBody" resource="i:#comment-' + commentNode.id + '">\
    	<h2 property="schema:name">Comment</h2>\
    	<div datatype="rdf:HTML" property="rdf:value schema:description" resource="i:#comment-' + commentNode.id + '" typeof="oa:TextualBody">' + commentNode.comment + '</div></section></br></br>'

        if (commentNode.answers.length > 0) {
            for (let i = 0; i < commentNode.answers.length; i++) {
                commentBody += '<h2 property="schema:name">Answers</h2></br>/br><dl class="author-name"><dt>Authors</dt><dd><span rel="schema:creator"><span about="userURI#' + commentNode.answers[i].user + '" typeof="schema:Person">\
    	<img alt="" rel="schema:image" src="' + commentNode.answers[i].userAvatar + '" width="48" height="48"> <a href="#">\
    	<span about="userURI#' + commentNode.answers[i].user + '" property="schema:name">' + commentNode.answers[i].userName + '</span></a></span></span></dd></dl>\
    	<dl class="published"><dt>Published</dt><dd><a href="' + window.location.href + '#' + commentNode.answers[i].id + '"><time datetime="' + commentNode.answers[i].date + '" datatype="xsd:dateTime" property="schema:datePublished" content="' + commentNode.answers[i].date + '">' + commentNode.answers[i].date + '</time></a></dd>\
    	<section id="answer-' + commentNode.answers[i].id + '" rel="oa:hasBody" resource="i:#answer-' + commentNode.answers[i].id + '">\
    	<h2 property="schema:name">Answer</h2>\
    	<div datatype="rdf:HTML" property="rdf:value schema:description" resource="i:#answer-' + commentNode.answers[i].id + '" typeof="oa:TextualBody">' + commentNode.answers[i].comment + '</div></section>'

            }

        }

        let commentEnd = '</article></main></body></html>',
            commentFile = {
                filename: 'comment#' + commentNode.id + '.html',
                contents: commentHeader + commentBody + commentEnd
            }
        return commentFile
    }

    converAuthorsToRDFa(dom) {

        jQuery(dom).find('div.article-authors').attr({
            "id": "authors"
        })
        return dom
    }

    convertAbstractToRDF(dom) {
        //jQuery(dom).find('div.article-abstract').parent().before('<div calss="article-content" id="content">')
        var abstractEl = jQuery(dom).find('div.article-abstract')
        if (!abstractEl.length) {
            return dom
        }
        abstractEl.attr({
            "datatype": "rdf:HTML",
            "property": "schema:abstract"
        })
        var abstractSection = abstractEl.wrap('<p/>').parent().html()
        abstractSection = abstractSection
        //.replace(/<div/g,'<div calss="article-content" id="content"> <section id="abstract"> <div')
            .replace(/<div/g, '<section id="Abstract"')
            .replace(/<\/div>/g, '</section>')
        jQuery(dom).find('div.article-abstract').parent().html(
            abstractSection)
        jQuery(dom).find('div.article-abstract').unwrap()
        jQuery(dom).find('div.article-content').unwrap()
        return dom
    }


    addSectionsTag(dom) {
        var className
        jQuery(dom).find('h2').each(function(index) {
            if (this.classList !== null && this.innerHTML !== null) {
                className = this.innerHTML
                className = className.replace(/\s+/g, '')
                this.classList.add(className)
                this.id = className
                this.outerHTML =
                    `<section id="${className}" resource="#${className}">
                        <h3 property="schema:name">${this.innerHTML}</h3>
                    </section>`
		 console.log("converting h2")
                //console.log(this.outerHTML)
            }
        })

	var className
        jQuery(dom).find('h1').each(function(index) {
            if (this.classList !== null && this.innerHTML !== null) {
                className = this.innerHTML
                className = className.replace(/\s+/g, '')
		//Titles are also H1 in FW, which have not class names
		if(className){
		    this.classList.add(className)
                    this.id = className
                    this.outerHTML =
                    `<section id="${className}" resource="#${className}">
                        <h2 property="schema:name">${this.innerHTML}</h2>
                    </section>`
		}
            }
        })

        var className
        jQuery(dom).find('h3').each(function(index) {
            if (this.classList !== null && this.innerHTML !== null) {
                className = this.innerHTML
                className = className.replace(/\s+/g, '')
                this.classList.add(className)
                this.id = className
                this.outerHTML =
                    `<section id="${className}" inlist="" " resource="#${className}">
                        <h4 property="schema:name">${this.innerHTML}</h4>
                    </section>`
            }
        })
        
        return dom
    }

    replaceImgSrc(htmlString) {
        htmlString = htmlString.replace(/<(img|IMG) data-src([^>]+)>/gm,
            "<$1 src$2>")
        return htmlString
    }
}
