/**
 * This file is part of Fidus Writer <http://www.fiduswriter.org>
 *
 * Copyright (C) 2013 Takuto Kojima, Johannes Wilm
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as
 * published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 */

(function (jQuery) {
    var Sys = function(){
        this.abbreviations = {"default": {}};
        this.abbrevsname = "default";
    };

    Sys.prototype.retrieveItem = function(id){
        return CSLDB[id];
    };

    Sys.prototype.retrieveLocale = function(lang){
        return citeprocHelpers.locals[lang];
    };

    Sys.prototype.getAbbreviation = function(dummy, obj, jurisdiction, vartype, key){
        try {
            if (this.abbreviations[this.abbrevsname][vartype][key]) {
                obj["default"][vartype][key] = this.abbreviations[this.abbrevsname][vartype][key];
            } else {
                obj["default"][vartype][key] = "";
            }
        } catch (e) {
            // There is breakage here that needs investigating.
        }
    };

    citeprocHelpers.getOutputs = function(citations, citation_style, citation_formats, aBibDB) {
        bibliographyHelpers.setCSLDB(aBibDB);
        var citeproc,
            citation_texts = [],
            isAuthDate = _.include(this.authorDateStyles, citation_style),
            i, len = citations.length;

        if(this.styles.hasOwnProperty(citation_style)) {
            citation_style = this.styles[citation_style];
        } else {
            for(style_name in this.styles) {
                citation_style = this.styles[style_name];
                break;
            }
        }

        citeproc = new CSL.Engine(new Sys(), citation_style);

        for(i = 0; i < len; i ++) {
            var citation = citations[i],
                citation_text = citeproc.appendCitationCluster(citation);

            if(isAuthDate && 'textcite' == citation_formats[i]) {
                var new_cite_text = '',
                    only_name_option, only_date_option,
                    items = citation.citationItems,
                    j, len2 = items.length;

                for(j = 0; j < len2; j ++) {
                    only_name_option = [{
                        id: items[j].id,
                        "author-only": 1
                    }];

                    only_date_option = [{
                        id: items[j].id,
                        "suppress-author": 1
                    }];

                    if(items[j].locator) {
                       only_date_option[0].label = items[j].locator;
                    }

                    if(items[j].label) {
                       only_date_option[0].label = items[j].label;
                    }

                    if(items[j].prefix) {
                       only_date_option[0].prefix = items[j].prefix;
                    }

                    if(items[j].suffix) {
                        only_date_option[0].suffix = items[j].suffix;
                    }

                    if(0 < j) { new_cite_text += '; '; }
                    new_cite_text += citeproc.makeCitationCluster(only_name_option);
                    new_cite_text += ' ' + citeproc.makeCitationCluster(only_date_option);
                }

                citation_text[0][1] = new_cite_text;
            }

            citation_texts.push(citation_text);
        }

        return {
            'citations': citation_texts,
            'bibliography': citeproc.makeBibliography(),
            'citationtype': citeproc.cslXml.className
        };
    };
})(jQuery);
