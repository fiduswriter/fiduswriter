/** A template for HTML+RDFa export of a document. Using dokieli template */
export let htmlExportTemplate = _.template('<!DOCTYPE html>\n\
    <html>\n<head><title><%= title %></title>\
        <% var tempNode; %>\
        <% _.each(styleSheets, function(item){ %>\
            \t<link rel="stylesheet" type="text/css" href="<%= item.filename %>" />\
        <% }); %>\
<meta charset="utf-8" />\
    <meta content="width=device-width, initial-scale=1" name="viewport" />\
    <link href="https://dokie.li/media/css/basic.css" media="all" rel="stylesheet" title="Basic" />\
    <link disabled="" href="https://dokie.li/media/css/lncs.css" media="all" rel="stylesheet alternate" title="LNCS" />\
    <link href="https://dokie.li/media/css/acm.css" media="all" rel="stylesheet" title="ACM" />\
    <link href="https://dokie.li/media/css/do.css" media="all" rel="stylesheet" />\
    <link href="https://maxcdn.bootstrapcdn.com/font-awesome/4.7.0/css/font-awesome.min.css" media="all" rel="stylesheet" />\
    <script src="https://dokie.li/scripts/simplerdf.js"></script>\
    <script src="https://dokie.li/scripts/medium-editor.min.js"></script>\
    <script src="https://dokie.li/scripts/do.js"></script>\
        </head>\
	<body about="" id="article" typeof="schema:ScholarlyArticle sioc:Post prov:Entity foaf:Document sioc:Post biblio:Paper bibo:Document as:Article" prefix="rdf: http://www.w3.org/1999/02/22-rdf-syntax-ns# rdfs: http://www.w3.org/2000/01/rdf-schema# owl: http://www.w3.org/2002/07/owl# xsd: http://www.w3.org/2001/XMLSchema# dcterms: http://purl.org/dc/terms/ dctypes: http://purl.org/dc/dcmitype/ foaf: http://xmlns.com/foaf/0.1/ v: http://www.w3.org/2006/vcard/ns# pimspace: http://www.w3.org/ns/pim/space# cc: https://creativecommons.org/ns# skos: http://www.w3.org/2004/02/skos/core# prov: http://www.w3.org/ns/prov# qb: http://purl.org/linked-data/cube# schema: http://schema.org/ void: http://rdfs.org/ns/void# rsa: http://www.w3.org/ns/auth/rsa# cert: http://www.w3.org/ns/auth/cert# cal: http://www.w3.org/2002/12/cal/ical# wgs: http://www.w3.org/2003/01/geo/wgs84_pos# org: http://www.w3.org/ns/org# biblio: http://purl.org/net/biblio# bibo: http://purl.org/ontology/bibo/ book: http://purl.org/NET/book/vocab# ov: http://open.vocab.org/terms/ sioc: http://rdfs.org/sioc/ns# doap: http://usefulinc.com/ns/doap# dbr: http://dbpedia.org/resource/ dbp: http://dbpedia.org/property/ sio: http://semanticscience.org/resource/ opmw: http://www.opmw.org/ontology/ deo: http://purl.org/spar/deo/ doco: http://purl.org/spar/doco/ cito: http://purl.org/spar/cito/ fabio: http://purl.org/spar/fabio/ oa: http://www.w3.org/ns/oa# as: https://www.w3.org/ns/activitystreams# ldp: http://www.w3.org/ns/ldp# solid: http://www.w3.org/ns/solid/terms# acl: http://www.w3.org/ns/auth/acl# dio: https://w3id.org/dio#">  	<main><article about="" typeof="schema:Article">\
	  	<div calss="article-content" id="content">\
        		<% if (part && part !="") { %>\
			  <section id="part">\
          		  <h2 class="part"><%= part %></h2>\
			 </section>\
       			 <% } %>\
        		<%= contents %>\
			</div>\
			</article>\
		</main>\
	</body>\
</html>')
