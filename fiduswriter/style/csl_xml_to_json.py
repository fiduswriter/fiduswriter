#!/usr/bin/env python3
from xml.dom import minidom

# Based on https://bitbucket.org/fbennett/citeproc-js/src/default/makejson.py
# by Frank Bennett
# See license info
# https://bitbucket.org/fbennett/citeproc-js/src/default/LICENSE


class XMLWalker:

    def __init__(self, xmlstring):
        dom = minidom.parseString(xmlstring).documentElement
        self.output = self.walk_xml(dom)

    def walk_xml(self, elem):
        obj = {}
        obj["name"] = elem.nodeName
        obj["attrs"] = {}
        if elem.attributes:
            for key in elem.attributes.keys():
                obj["attrs"][key] = elem.attributes[key].value
        obj["children"] = []
        if len(elem.childNodes) == 0 and elem.nodeName == "term":
            obj["children"] = [""]
        for child in elem.childNodes:
            if child.nodeName == "#comment":
                pass
            elif child.nodeName == "#text":
                if (
                    len(elem.childNodes) == 1 and
                    elem.nodeName in ["term", "single", "multiple"]
                ):
                    obj["children"].append(child.wholeText)
            else:
                obj["children"].append(self.walk_xml(child))
        return obj


if __name__ == "__main__":
    import json
    import sys
    if len(sys.argv) > 1:
        walker = XMLWalker(open(sys.argv[1]).read())
    else:
        walker = XMLWalker(sys.stdin.read())
    print(json.dumps(walker.output, indent=4))
