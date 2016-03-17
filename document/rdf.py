"""Class for creating RDF output. Can be used to interconnect (integrate) different applications"""

from rdflib import BNode, Literal, URIRef, Graph, plugin
from rdflib.namespace import RDF, FOAF, DC, DCTERMS, NamespaceManager, Namespace
from datetime import datetime
from django.conf import settings


BASE_FIDUS_URI = 'http://fiduswriter.org/'


class RDFBuilder(object):
    """
    Class for building rdf graphs from document
    author: akorovin
    """

    def __init__(self, host_url):
        self._graph = Graph()
        self._ns_manager = NamespaceManager(self._graph)
        self._initialize_prefixes()
        self._namespaces = dict((x,Namespace(y)) for x, y in self._ns_manager.namespaces())
        self._host_url = host_url

    def _initialize_prefixes(self):
        """
        Method to initialize namespaces in graph
        :return: None
        :rtype: None
        """
        oaNs = Namespace('http://www.w3.org/ns/oa#')
        reviewNs = Namespace('http://eis.iai.uni-bonn.de/Projects/OSCOSS/reviews/')

        self._ns_manager.bind('oa', oaNs)
        self._ns_manager.bind('review', reviewNs)
        self._ns_manager.bind('foaf', FOAF)

    def _add_comments_to_rdf_graph(self, comments_content, document_node):
        """
        Private method for adding comments to graph
        :param comments_content: Filtered comments
        :type comments_content: dict
        :param document_node: Document root in the graph
        :type document_node: RDF triple
        :return: None
        :rtype: None
        """
        is_major_predicate = self._namespaces['review'].isMajor
        oa_ns = self._namespaces['oa']

        for comment_index, cur_comment_json in comments_content.iteritems():
            cur_comment_node = URIRef(document_node.toPython() + '/comments/' + comment_index)
            self._graph.add((cur_comment_node, RDF.type, oa_ns.Annotation))
            self._graph.add((cur_comment_node, oa_ns.annotateAt, Literal(datetime.fromtimestamp(cur_comment_json['date']/1000))))
            self._graph.add((cur_comment_node, oa_ns.hasBody, Literal(cur_comment_json['comment'])))
            self._graph.add((cur_comment_node, oa_ns.annotatedBy, Literal(cur_comment_json['userName'])))
            self._graph.add((cur_comment_node, oa_ns.hasTarget, document_node)) #TODO: this is lazy solution. need to add range
            if 'review:isMajor' in cur_comment_json.keys():
                self._graph.add((cur_comment_node, is_major_predicate, Literal(cur_comment_json['review:isMajor'])))

    def get_comments_by_document(self, document, comments_content, format='turtle'):
        """
        Getting rdf comments by document id
        :param request: Incoming request
        :type request: dict
        :param content_type: Type of content
        :type content_type: string
        :param document_id: Id of document
        :type document_id: int
        :param format: Serialization format. Default is Turtle
        :type format: string
        :return: Serialized graph
        :rtype: string
        """

        document_id = document.id
        document_node = URIRef(self._host_url + "document/" + str(document_id))

        self._graph.add((document_node, RDF.type, FOAF.Document))
        self._add_comments_to_rdf_graph(comments_content, document_node)

        #TODO: support json -ld
        #context = {"@vocab": BASE_FIDUS_URI + "oscoss.jsonld", "@language": "en"}
        #graph_json = graph.serialize(format='json-ld', context=context, indent=4)
        graph = self._graph.serialize(format=format)
        self._remove_root_graph(document_node)
        return graph
        #return HttpResponse(json.dumps(graph_json), content_type='application/json')

    def _remove_root_graph(self, document_node):
        """
        Removes document node from the graph
        :param document_node: Document triple root
        :type document_node: RDF triple
        :return: None
        :rtype: None
        """
        self._graph.remove((document_node, None, None))




