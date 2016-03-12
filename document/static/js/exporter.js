/* This file has been automatically generated. DO NOT EDIT IT. 
 Changes will be overwritten. Edit exporter.es6.js and run ./es6-compiler.sh */
(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.savecopy = undefined;

var _native = require('./native');

var savecopy = exports.savecopy = function savecopy(aDocument) {
    function importAsUser(aDocument, shrunkImageDB, shrunkBibDB, images) {
        // switch to user's own ImageDB and BibDB:
        if (window.hasOwnProperty('theEditor')) {
            theEditor.doc.owner = theEditor.user;
            delete window.ImageDB;
            delete window.BibDB;
        }
        importer.getDBs(aDocument, shrunkBibDB, shrunkImageDB, images);
    }
    if (window.hasOwnProperty('theEditor')) {
        (0, _native.exportNative)(aDocument, ImageDB, BibDB, importAsUser);
    } else {
        bibliographyHelpers.getABibDB(aDocument.owner, function (aBibDB) {
            usermediaHelpers.getAnImageDB(aDocument.owner, function (anImageDB) {
                (0, _native.exportNative)(aDocument, anImageDB, aBibDB, importAsUser);
            });
        });
    }
};

},{"./native":9}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
/** Offers a file to the user as if it were downloaded.
 * @function downloadFile
 * @param {string} zipFileName The name of the file.
 * @param {blob} blob The contents of the file.
 */
var downloadFile = exports.downloadFile = function downloadFile(zipFilename, blob) {
    var blobURL = URL.createObjectURL(blob);
    var fakeDownloadLink = document.createElement('a');
    var clickEvent = document.createEvent("MouseEvent");
    clickEvent.initMouseEvent("click", true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
    fakeDownloadLink.href = blobURL;
    fakeDownloadLink.setAttribute('download', zipFilename);
    fakeDownloadLink.dispatchEvent(clickEvent);
};

},{}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.navItemTemplate = exports.navTemplate = exports.xhtmlTemplate = exports.ncxItemTemplate = exports.ncxTemplate = exports.containerTemplate = exports.opfTemplate = exports.opfImageItemTemplatePart = exports.opfCssItemTemplatePart = exports.opfMathjaxItemsTemplatePart = undefined;

var _htmlTemplates = require('./html-templates');

/** A template to include MathJax in an Epub's OPF file. */
var opfMathjaxItemsTemplatePart = exports.opfMathjaxItemsTemplatePart = '\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Regular/BasicLatin.js" id="id0" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/MiscMathSymbolsB.js" id="id1" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/d.js" id="id2" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/jax.js" id="id3" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/cancel.js" id="id4" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/a.js" id="id5" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/AsciiMath/jax.js" id="id6" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/autoload/ms.js" id="id7" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/mathchoice.js" id="id8" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Script/Regular/Main.js" id="id9" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/extpfeil.js" id="id10" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/AsciiMath/config.js" id="id11" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/Arrows.js" id="id12" media-type="application/x-javascript"/>\
        <item href="mathjax/images/CloseX-31.png" id="id13" media-type="image/png"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Italic/LatinExtendedA.js" id="id14" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/SansSerif/Italic/Other.js" id="id15" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Size3/Regular/Main.js" id="id16" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Size2/Regular/Main.js" id="id17" media-type="application/x-javascript"/>\
        <item href="mathjax/images/MenuArrow-15.png" id="id18" media-type="image/png"/>\
        <item href="mathjax/jax/input/TeX/jax.js" id="id19" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Size1/Regular/Main.js" id="id20" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/h.js" id="id21" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/l.js" id="id22" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Fraktur/Bold/PUA.js" id="id23" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/AMSsymbols.js" id="id24" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Regular/CombDiacritMarks.js" id="id25" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Fraktur/Regular/PUA.js" id="id26" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/GreekAndCoptic.js" id="id27" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Italic/LatinExtendedB.js" id="id28" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/LatinExtendedA.js" id="id29" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/MiscSymbols.js" id="id30" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/scr.js" id="id31" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Regular/MiscSymbols.js" id="id32" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/MiscTechnical.js" id="id33" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/newcommand.js" id="id34" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/autoload/mmultiscripts.js" id="id35" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/p.js" id="id36" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Typewriter/Regular/Main.js" id="id37" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/o.js" id="id38" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/autoload/annotation-xml.js" id="id39" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/u.js" id="id40" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Fraktur/Bold/BasicLatin.js" id="id41" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Fraktur/Regular/BasicLatin.js" id="id42" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Size4/Regular/Main.js" id="id43" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/noUndefined.js" id="id44" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/k.js" id="id45" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/LetterlikeSymbols.js" id="id46" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/HTML.js" id="id47" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Fraktur/Regular/Main.js" id="id49" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/MiscSymbolsAndArrows.js" id="id50" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/SansSerif/Bold/BasicLatin.js" id="id51" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/GeometricShapes.js" id="id52" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/GeometricShapes.js" id="id53" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/config.js" id="id54" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/enclose.js" id="id55" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/EnclosedAlphanum.js" id="id56" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/mhchem.js" id="id57" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/verb.js" id="id58" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/GeneralPunctuation.js" id="id59" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/MathMenu.js" id="id60" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/GeometricShapes.js" id="id61" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/PUA.js" id="id62" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Italic/LetterlikeSymbols.js" id="id63" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/z.js" id="id64" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Fraktur/Bold/Main.js" id="id65" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/SpacingModLetters.js" id="id66" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Fraktur/Bold/Other.js" id="id67" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/autoload-all.js" id="id68" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/SansSerif/Bold/CombDiacritMarks.js" id="id69" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/noErrors.js" id="id70" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/g.js" id="id71" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/SansSerif/Regular/BasicLatin.js" id="id72" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Regular/SpacingModLetters.js" id="id73" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/MiscSymbols.js" id="id74" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Regular/GreekAndCoptic.js" id="id75" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Italic/Main.js" id="id76" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/mml2jax.js" id="id77" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Regular/GeometricShapes.js" id="id78" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/i.js" id="id79" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/q.js" id="id80" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/toMathML.js" id="id81" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/NativeMML/config.js" id="id82" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/BasicLatin.js" id="id83" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/boldsymbol.js" id="id84" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Typewriter/Regular/Other.js" id="id85" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/BoxDrawing.js" id="id86" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/begingroup.js" id="id87" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/v.js" id="id88" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/MiscMathSymbolsA.js" id="id89" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Math/BoldItalic/Main.js" id="id90" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/SansSerif/Bold/Other.js" id="id91" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/autoload/menclose.js" id="id92" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/LetterlikeSymbols.js" id="id93" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Typewriter/Regular/CombDiacritMarks.js" id="id94" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Italic/GeneralPunctuation.js" id="id95" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/MiscMathSymbolsB.js" id="id96" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/x.js" id="id97" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/SansSerif/Regular/Other.js" id="id98" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/j.js" id="id99" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/MathZoom.js" id="id100" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/MiscMathSymbolsA.js" id="id101" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/unicode.js" id="id102" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/c.js" id="id103" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/NativeMML/jax.js" id="id104" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/SupplementalArrowsB.js" id="id105" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/autobold.js" id="id106" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/SuppMathOperators.js" id="id107" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/SansSerif/Regular/Main.js" id="id108" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/action.js" id="id109" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/fr.js" id="id110" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/Dingbats.js" id="id111" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/Dingbats.js" id="id112" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/SansSerif/Italic/CombDiacritMarks.js" id="id113" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/Arrows.js" id="id114" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/MathEvents.js" id="id115" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Italic/MathOperators.js" id="id116" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Caligraphic/Bold/Main.js" id="id117" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Regular/MathOperators.js" id="id118" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/Latin1Supplement.js" id="id119" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/CombDiacritMarks.js" id="id120" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/f.js" id="id121" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/Main.js" id="id122" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/bbox.js" id="id123" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/config.js" id="id124" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/CombDiactForSymbols.js" id="id125" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/SansSerif/Regular/CombDiacritMarks.js" id="id126" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/Arrows.js" id="id127" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/SupplementalArrowsA.js" id="id128" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/r.js" id="id129" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/GeneralPunctuation.js" id="id130" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/SansSerif/Italic/BasicLatin.js" id="id131" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/SuppMathOperators.js" id="id132" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/opf.js" id="id133" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/fontdata.js" id="id134" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/SpacingModLetters.js" id="id135" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/autoload/mglyph.js" id="id136" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/MathOperators.js" id="id137" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Italic/GreekAndCoptic.js" id="id138" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/CombDiactForSymbols.js" id="id139" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/SansSerif/Bold/Main.js" id="id140" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/w.js" id="id141" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/MiscTechnical.js" id="id142" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/Latin1Supplement.js" id="id143" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/MathOperators.js" id="id144" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Regular/LetterlikeSymbols.js" id="id146" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/m.js" id="id147" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/GeneralPunctuation.js" id="id148" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/autoload/multiline.js" id="id149" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/LatinExtendedA.js" id="id150" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/autoload/mtable.js" id="id151" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Regular/LatinExtendedA.js" id="id152" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/SansSerif/Italic/Main.js" id="id153" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/asciimath2jax.js" id="id154" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/jax.js" id="id155" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/AMSmath.js" id="id156" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/b.js" id="id157" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/fontdata-extra.js" id="id158" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/SuppMathOperators.js" id="id159" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/MathOperators.js" id="id160" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/s.js" id="id161" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Script/Regular/BasicLatin.js" id="id162" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Caligraphic/Regular/Main.js" id="id163" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/SpacingModLetters.js" id="id164" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/GreekAndCoptic.js" id="id165" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Italic/BasicLatin.js" id="id166" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/SupplementalArrowsA.js" id="id167" media-type="application/x-javascript"/>\
        <item href="mathjax/MathJax.js" id="id168" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/TeX/config.js" id="id169" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/BasicLatin.js" id="id170" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/CombDiacritMarks.js" id="id171" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/TeX/color.js" id="id172" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/Main.js" id="id173" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Regular/LatinExtendedB.js" id="id174" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Italic/CombDiacritMarks.js" id="id175" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Fraktur/Regular/Other.js" id="id176" media-type="application/x-javascript"/>\
        <item href="mathjax/extensions/tex2jax.js" id="id177" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/MiscTechnical.js" id="id178" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/autoload/maction.js" id="id179" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/GreekAndCoptic.js" id="id180" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Bold/LatinExtendedB.js" id="id181" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/n.js" id="id182" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/t.js" id="id183" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Typewriter/Regular/BasicLatin.js" id="id184" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Regular/SuppMathOperators.js" id="id185" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/y.js" id="id186" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/jax.js" id="id187" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/input/MathML/entities/e.js" id="id188" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/LetterlikeSymbols.js" id="id189" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/AMS/Regular/Latin1Supplement.js" id="id190" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/element/mml/optable/CombDiacritMarks.js" id="id191" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Math/Italic/Main.js" id="id192" media-type="application/x-javascript"/>\
        <item href="mathjax/jax/output/SVG/fonts/TeX/Main/Regular/Main.js" id="id193" media-type="application/x-javascript"/>';

/** A template for each CSS item of an epub's OPF file. */
var opfCssItemTemplatePart = exports.opfCssItemTemplatePart = '\t\t\t<item id="css<%= index %>" href="<%= item.filename %>" media-type="text/css" />\n';

/** A template for each image in an epub's OPF file. */
var opfImageItemTemplatePart = exports.opfImageItemTemplatePart = '\t\t\t<item <% if (item.coverImage) { %>id="cover-image" properties="cover-image"<% } else { %>id="img<%= index %>"<% } %> href="<%= item.filename %>" media-type="image/<% if (item.filename.split(".")[1]==="png") { %>png<% } else if (item.filename.split(".")[1]==="svg") { %>svg+xml<% } else { %>jpeg<% } %>" />\n';

/** A template for the OPF file of an epub. */
var opfTemplate = exports.opfTemplate = _.template('<?xml version="1.0" encoding="UTF-8"?>\n\
    <package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="<%= idType %>" xml:lang="<%= language %>" prefix="cc: http://creativecommons.org/ns#">\n\
    \t<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n\
    \t\t<dc:identifier id="<%= idType %>"><%= id %></dc:identifier>\n\
    \t\t<dc:title><%= title %></dc:title>\n\
    <% _.each(authors,function(author){ %>\
        \t\t<dc:creator><%= author %></dc:creator>\n\
    <% }); %>\
    <% _.each(keywords,function(keyword){ %>\
        \t\t<dc:subject><%= keyword %></dc:subject>\n\
    <% }); %>\
    \t\t<dc:language><%= language %></dc:language>\n\
    \t\t<dc:date><%= date %></dc:date>\n\
    \t\t<meta property="dcterms:modified"><%= modified %></meta>\n\
    \t</metadata>\n\
    \t<manifest>\n\
    \t\t<item id="t1" href="document.xhtml" <% if (mathjax) { %>properties="scripted svg" <% } %>media-type="application/xhtml+xml" />\n\
    \t\t<item id="nav" href="document-nav.xhtml" properties="nav" media-type="application/xhtml+xml" />\n\
        <% _.each(images,function(item, index){ %>' + opfImageItemTemplatePart + '<% }); %>\
        <% _.each(styleSheets,function(item, index){ %>' + opfCssItemTemplatePart + '<% }); %>\
        <% if (mathjax) {%>' + opfMathjaxItemsTemplatePart + '<% }%>\
    \t\t<!-- ncx included for 2.0 reading system compatibility: -->\n\
    \t\t<item id="ncx" href="document.ncx" media-type="application/x-dtbncx+xml" />\n\
    \t</manifest>\n\
    \t<spine toc="ncx">\n\
    \t\t<itemref idref="t1" />\n\
    \t</spine>\n\
    </package>');

/** A template for the contianer XML of an epub file. */
var containerTemplate = exports.containerTemplate = _.template('<?xml version="1.0" encoding="UTF-8"?>\n\
    <container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">\n\
    \t<rootfiles>\n\
    \t\t<rootfile full-path="EPUB/document.opf" media-type="application/oebps-package+xml"/>\n\
    \t</rootfiles>\n\
    </container>');

/** A template of the NCX file of an epub. */
var ncxTemplate = exports.ncxTemplate = _.template('<?xml version="1.0" encoding="UTF-8"?>\n\
    <ncx xmlns:ncx="http://www.daisy.org/z3986/2005/ncx/" xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="<%= shortLang %>">\n\
        \t<head>\n\
                \t\t<meta name="dtb:<%= idType %>" content="<%= id %>"/>\n\
        \t</head>\n\
        \t<docTitle>\n\
            \t\t<text><%= title %></text>\n\
        \t</docTitle>\n\
        \t<navMap>\n\
                \t\t<!-- 2.01 NCX: playOrder is optional -->\n\
            <% _.each(contentItems,function(item){ %>\
               <%= exporter.ncxItemTemplate({"item":item})%>\
            <% }); %>\
        \t</navMap>\n\
    </ncx>');

/** A template for each list item in the navMap of an epub's NCX file. */
var ncxItemTemplate = exports.ncxItemTemplate = _.template('\
\t\t<navPoint id="<%= item.id %><% if (item.docNum) {print("-"+item.docNum);}%>">\n\
        \t\t\t<navLabel>\n\
            \t\t\t\t<text><%= item.title %></text>\n\
        \t\t\t</navLabel>\n\
        \t\t\t<content src="<% if (item.link) {print(item.link);} else { %>document<% if (item.docNum) {print("-"+item.docNum);}%>.xhtml#<% print(item.id) } %>"/>\n\
        <% _.each(item.subItems, function(item) { %>\
            <%= exporter.ncxItemTemplate({"item":item})%>\
        <% }); %>\
    \t\t</navPoint>\n');

/** A template for each CSS item in an epub document file. */
var xhtmlCssItemTemplatePart = '\t<link rel="stylesheet" type="text/css" href="<%= item.filename %>" />';

/** A template to initiate MathJax execution in the header of an XHTML document if it includes MathJax. */
var mathjaxXhtmlHeaderStarterTemplatePart = '\
    <script type="text/javascript">\
        <![CDATA[\
            document.addEventListener("DOMContentLoaded", function () {\
                if (window.hasOwnProperty("MathJax")) {\
                    var mjQueue = MathJax.Hub.queue;\
                    var equations = document.body.querySelectorAll(".equation");\
                    for (var i = 0; i < equations.length; i++) {\
                        equations[i].innerHTML = "[MATH]"+equations[i].getAttribute("data-equation")+"[/MATH]";\
                        mjQueue.Push(["Typeset",MathJax.Hub,equations[i]]);\
                    }\
                    var fequations = document.body.querySelectorAll(".figure-equation");\
                    for (var i = 0; i < fequations.length; i++) {\
                        fequations[i].innerHTML = "[DMATH]"+fequations[i].getAttribute("data-equation")+"[/DMATH]";\
                        mjQueue.Push(["Typeset",MathJax.Hub,fequations[i[]);\
                    }\
                }\
            });\
        ]]>\
    </script>\
    ';

/** A template for a document in an epub. */
var xhtmlTemplate = exports.xhtmlTemplate = _.template('<?xml version="1.0" encoding="UTF-8"?>\n\
    <html xmlns="http://www.w3.org/1999/xhtml" xml:lang="<%= shortLang %>" lang="<%= shortLang %>"\
        xmlns:epub="http://www.idpf.org/2007/ops">\n<head><title><%= title %></title>\
        <% _.each(styleSheets,function(item){ %>' + xhtmlCssItemTemplatePart + '<% }); %>\
        <% if (mathjax) { %>' + _htmlTemplates.mathjaxHtmlHeaderTemplatePart + +mathjaxXhtmlHeaderStarterTemplatePart + '<% } %>\
        </head><body \
        <% if (mathjax) { %>\
            class="tex2jax_ignore">\
            <%= mathjax %>\
        <% } else { %>\
            >\
        <% } %>\
        <% if (part && part !="") {%>\
            <h1 class="part"><%= part %></h1>\
        <% } %>\
        <%= body %></body></html>');

/** A template for an epub's navigation document. */
var navTemplate = exports.navTemplate = _.template('<?xml version="1.0" encoding="UTF-8"?>\n\
    <html xmlns="http://www.w3.org/1999/xhtml" xml:lang="<%= shortLang %>" lang="<%= shortLang %>" xmlns:epub="http://www.idpf.org/2007/ops">\n\
    \t<head>\n\
    \t\t<meta charset="utf-8"></meta>\n\
    \t</head>\n\
    \t<body>\n\
    \t\t<nav epub:type="toc" id="toc">\n\
    \t\t\t<ol>\n\
        <% _.each(contentItems,function(item){ %>\
            <%= exporter.navItemTemplate({"item":item})%>\
        <% }); %>\
    \t\t\t</ol>\n\
    \t\t</nav>\n\
    \t</body>\n\
    </html>');

/** A template for each item in an epub's navigation document. */
var navItemTemplate = exports.navItemTemplate = _.template('\t\t\t\t<li><a href="<% if (item.link) {print(item.link);} else { %>document<% if (item.docNum) {print("-"+item.docNum);}%>.xhtml#<% print(item.id); } %>"><%= item.title %></a>\
    <% if (item.subItems.length > 0) { %>\
        <ol>\
            <% _.each(item.subItems,function(item){ %>\
                <%= exporter.navItemTemplate({"item":item})%>\
            <% }); %>\
        </ol>\
    <% } %>\
</li>\n');

},{"./html-templates":5}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.orderLinks = exports.setLinks = exports.downloadEpub = exports.getTimestamp = exports.styleEpubFootnotes = undefined;

var _html = require("./html");

var _json = require("./json");

var _tools = require("./tools");

var _zip = require("./zip");

var _epubTemplates = require("./epub-templates");

var styleEpubFootnotes = exports.styleEpubFootnotes = function styleEpubFootnotes(htmlCode) {
    var footnotesCode = '',
        footnoteCounter = 0;
    jQuery(htmlCode).find('.footnote').each(function () {
        footnoteCounter++;
        footnotesCode += '<aside epub:type="footnote" id="n' + footnoteCounter + '"><p>' + footnoteCounter + ' ' + this.innerHTML + '</p></aside>';
        jQuery(this).replaceWith('<sup><a epub:type="noteref" href="#n' + footnoteCounter + '">' + footnoteCounter + '</a></sup>');
    });
    htmlCode.innerHTML += footnotesCode;

    return htmlCode;
};

var getTimestamp = exports.getTimestamp = function getTimestamp() {
    var today = new Date();
    var second = today.getUTCSeconds();
    var minute = today.getUTCMinutes();
    var hour = today.getUTCHours();
    var day = today.getUTCDate();
    var month = today.getUTCMonth() + 1; //January is 0!
    var year = today.getUTCFullYear();

    if (second < 10) {
        second = '0' + second;
    }
    if (minute < 10) {
        minute = '0' + minute;
    }
    if (hour < 10) {
        hour = '0' + hour;
    }
    if (day < 10) {
        day = '0' + day;
    }
    if (month < 10) {
        month = '0' + month;
    }

    return year + '-' + month + '-' + day + 'T' + hour + ':' + minute + ':' + second + 'Z';
};

var downloadEpub = exports.downloadEpub = function downloadEpub(aDocument) {
    if (window.hasOwnProperty('theEditor') || window.hasOwnProperty('BibDB') && aDocument.is_owner) {
        export1(aDocument, BibDB);
    } else if (aDocument.is_owner) {
        bibliographyHelpers.getBibDB(function () {
            export1(aDocument, BibDB);
        });
    } else {
        bibliographyHelpers.getABibDB(aDocument.owner, function (aBibDB) {
            export1(aDocument, aBibDB);
        });
    }
};

var export1 = function export1(aDocument, aBibDB) {
    var styleSheets = []; //TODO: fill style sheets with something meaningful.
    var title = aDocument.title;

    $.addAlert('info', title + ': ' + gettext('Epub export has been initiated.'));

    var contents = document.createElement('div');

    if (aDocument.contents) {
        var tempNode = (0, _json.obj2Node)(aDocument.contents);

        while (tempNode.firstChild) {
            contents.appendChild(tempNode.firstChild);
        }
    }

    var bibliography = citationHelpers.formatCitations(contents, aDocument.settings.citationstyle, aBibDB);

    if (bibliography.length > 0) {
        contents.innerHTML += bibliography;
    }

    var images = (0, _tools.findImages)(contents);

    var startHTML = '<h1 class="title">' + title + '</h1>';

    if (aDocument.settings['metadata-subtitle'] && aDocument.metadata.subtitle) {
        var tempNode = (0, _json.obj2Node)(aDocument.metadata.subtitle);

        if (tempNode.textContent.length > 0) {
            startHTML += '<h2 class="subtitle">' + tempNode.textContent + '</h2>';
        }
    }
    if (aDocument.settings['metadata-abstract'] && aDocument.metadata.abstract) {
        var tempNode = (0, _json.obj2Node)(aDocument.metadata.abstract);
        if (tempNode.textContent.length > 0) {
            startHTML += '<div class="abstract">' + tempNode.textContent + '</div>';
        }
    }

    contents.innerHTML = startHTML + contents.innerHTML;

    contents = (0, _html.cleanHTML)(contents);

    var contentsBody = document.createElement('body');

    while (contents.firstChild) {
        contentsBody.appendChild(contents.firstChild);
    }

    var equations = contentsBody.querySelectorAll('.equation');

    var figureEquations = contentsBody.querySelectorAll('.figure-equation');

    var mathjax = false;

    if (equations.length > 0 || figureEquations.length > 0) {
        mathjax = true;
    }

    for (var i = 0; i < equations.length; i++) {
        mathHelpers.layoutMathNode(equations[i]);
    }
    for (var i = 0; i < figureEquations.length; i++) {
        mathHelpers.layoutDisplayMathNode(figureEquations[i]);
    }
    mathHelpers.queueExecution(function () {
        setTimeout(function () {
            export2(aDocument, contentsBody, images, title, styleSheets, mathjax);
        }, 2000);
    });
};

var export2 = function export2(aDocument, contentsBody, images, title, styleSheets, mathjax) {
    var contentsBodyEpubPrepared = undefined,
        xhtmlCode = undefined,
        containerCode = undefined,
        timestamp = undefined,
        keywords = undefined,
        contentItems = undefined,
        authors = undefined,
        tempNode = undefined,
        outputList = undefined,
        includeZips = [],
        opfCode = undefined,
        ncxCode = undefined,
        navCode = undefined,
        httpOutputList = [];

    if (mathjax) {
        mathjax = (0, _html.getMathjaxHeader)();

        if (mathjax) {
            mathjax = (0, _json.obj2Node)((0, _json.node2Obj)(mathjax), 'xhtml').outerHTML;
        }
    }

    // Make links to all H1-3 and create a TOC list of them
    contentItems = orderLinks(setLinks(contentsBody));

    contentsBodyEpubPrepared = styleEpubFootnotes(contentsBody);

    xhtmlCode = (0, _epubTemplates.xhtmlTemplate)({
        part: false,
        shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
        title: title,
        styleSheets: styleSheets,
        body: (0, _json.obj2Node)((0, _json.node2Obj)(contentsBodyEpubPrepared), 'xhtml').innerHTML,
        mathjax: mathjax
    });

    xhtmlCode = (0, _html.replaceImgSrc)(xhtmlCode);

    containerCode = (0, _epubTemplates.containerTemplate)({});

    timestamp = getTimestamp();

    authors = [aDocument.owner.name];

    if (aDocument.settings['metadata-authors'] && aDocument.metadata.authors) {
        tempNode = (0, _json.obj2Node)(aDocument.metadata.authors);
        if (tempNode.textContent.length > 0) {
            authors = jQuery.map(tempNode.textContent.split(","), jQuery.trim);
        }
    }

    keywords = [];

    if (aDocument.settings['metadata-keywords'] && aDocument.metadata.keywords) {
        tempNode = (0, _json.obj2Node)(aDocument.metadata.keywords);
        if (tempNode.textContent.length > 0) {
            keywords = jQuery.map(tempNode.textContent.split(","), jQuery.trim);
        }
    }

    opfCode = (0, _epubTemplates.opfTemplate)({
        language: gettext('en-US'), // TODO: specify a document language rather than using the current users UI language
        title: title,
        authors: authors,
        keywords: keywords,
        idType: 'fidus',
        id: aDocument.id,
        date: timestamp.slice(0, 10), // TODO: the date should probably be the original document creation date instead
        modified: timestamp,
        styleSheets: styleSheets,
        mathjax: mathjax,
        images: images
    });

    ncxCode = (0, _epubTemplates.ncxTemplate)({
        shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
        title: title,
        idType: 'fidus',
        id: aDocument.id,
        contentItems: contentItems
    });

    navCode = (0, _epubTemplates.navTemplate)({
        shortLang: gettext('en'), // TODO: specify a document language rather than using the current users UI language
        contentItems: contentItems
    });

    outputList = [{
        filename: 'META-INF/container.xml',
        contents: containerCode
    }, {
        filename: 'EPUB/document.opf',
        contents: opfCode
    }, {
        filename: 'EPUB/document.ncx',
        contents: ncxCode
    }, {
        filename: 'EPUB/document-nav.xhtml',
        contents: navCode
    }, {
        filename: 'EPUB/document.xhtml',
        contents: xhtmlCode
    }];

    for (var i = 0; i < styleSheets.length; i++) {
        outputList.push({
            filename: 'EPUB/' + styleSheets[i].filename,
            contents: styleSheets[i].contents
        });
    }

    for (var i = 0; i < images.length; i++) {
        httpOutputList.push({
            filename: 'EPUB/' + images[i].filename,
            url: images[i].url
        });
    }

    if (mathjax) {
        includeZips.push({
            'directory': 'EPUB',
            'url': mathjaxZipUrl
        });
    }

    (0, _zip.zipFileCreator)(outputList, httpOutputList, (0, _tools.createSlug)(title) + '.epub', 'application/epub+zip', includeZips);
};

var setLinks = exports.setLinks = function setLinks(htmlCode, docNum) {
    var contentItems = [],
        title = undefined;

    jQuery(htmlCode).find('h1,h2,h3').each(function () {
        title = jQuery.trim(this.textContent);
        if (title !== '') {
            var contentItem = {};
            contentItem.title = title;
            contentItem.level = parseInt(this.tagName.substring(1, 2));
            if (docNum) {
                contentItem.docNum = docNum;
            }
            if (this.classList.contains('title')) {
                contentItem.level = 0;
            }
            this.id = 'id' + contentItems.length;

            contentItem.id = this.id;
            contentItems.push(contentItem);
        }
    });
    return contentItems;
};

var orderLinks = exports.orderLinks = function orderLinks(contentItems) {
    for (var i = 0; i < contentItems.length; i++) {
        contentItems[i].subItems = [];
        if (i > 0) {
            for (var j = i - 1; j > -1; j--) {
                if (contentItems[j].level < contentItems[i].level) {
                    contentItems[j].subItems.push(contentItems[i]);
                    contentItems[i].delete = true;
                    break;
                }
            }
        }
    }

    for (var i = contentItems.length; i > -1; i--) {
        if (contentItems[i] && contentItems[i].delete) {
            delete contentItems[i].delete;
            contentItems.splice(i, 1);
        }
    }
    return contentItems;
};

},{"./epub-templates":3,"./html":6,"./json":7,"./tools":10,"./zip":13}],5:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/** A template for each item in an HTML export of a Fidus Writer document. */
var cssItemTemplatePart = '\t<link rel="stylesheet" type="text/css" href="<%= item.filename %>" />';

/** A template for the MathJax parts to include in the header of a HTML/XHTML document if it includes MathJax. */
var mathjaxHtmlHeaderTemplatePart = exports.mathjaxHtmlHeaderTemplatePart = '\
    <script type="text/x-mathjax-config">\
        MathJax.Hub.Config({\
            jax: ["input/TeX","output/SVG"],\
            tex2jax: {\
                    inlineMath: [ ["[MATH]","[/MATH]"]],\
                    displayMath: [ ["[DMATH]","[/DMATH]"]],\
                processEscapes: true\
            },\
            extensions: ["tex2jax.js"],\
            TeX: {\
                extensions: ["noErrors.js","noUndefined.js","autoload-all.js"]\
            },\
            showMathMenu: false,\
            messageStyle: "none"\
        });\
    </script>\
    <script type="text/javascript" src="mathjax/MathJax.js">\
    </script>\
    ';
/** A template to initiate MathJax execution in the header of a HTML document if it includes MathJax. */
var mathjaxHtmlHeaderStarterTemplatePart = '\
    <script type="text/javascript">\
            document.addEventListener("DOMContentLoaded", function () {\
                if (window.hasOwnProperty("MathJax")) {\
                    var mjQueue = MathJax.Hub.queue;\
                    var equations = document.body.querySelectorAll(".equation");\
                    for (var i = 0; i < equations.length; i++) {\
                        equations[i].innerHTML = "[MATH]"+equations[i].getAttribute("data-equation")+"[/MATH]";\
                        mjQueue.Push(["Typeset",MathJax.Hub,equations[i]]);\
                    }\
                    var fequations = document.body.querySelectorAll(".figure-equation");\
                    for (var i = 0; i < fequations.length; i++) {\
                        fequations[i].innerHTML = "[DMATH]"+fequations[i].getAttribute("data-equation")+"[/DMATH]";\
                        mjQueue.Push(["Typeset",MathJax.Hub,fequations[i]]);\
                    }\
                }\
            });\
    </script>\
    ';

/** A template for HTML export of a document. */
var htmlExportTemplate = exports.htmlExportTemplate = _.template('<!DOCTYPE html>\n\
    <html>\n<head><title><%= title %></title>\
        <% var tempNode; %>\
        <% _.each(styleSheets,function(item){ %>' + cssItemTemplatePart + '<% }); %>\
        <% if (mathjax) { %>' + mathjaxHtmlHeaderTemplatePart + +mathjaxHtmlHeaderStarterTemplatePart + '<% } %>\
        </head><body \
        class="tex2jax_ignore">\
        <% if (mathjax) { %>\
            <%= mathjax %>\
        <% } %>\
        <% if (part && part !="") { %>\
            <h1 class="part"><%= part %></h1>\
        <% } %>\
        <h1 class="title"><%= title %></h1>\
        <% if (settings["metadata-subtitle"] && metadata.subtitle) { %>\
            <% tempNode = exporter.obj2Node(metadata.subtitle); %>\
            <% if (tempNode.textContent.length > 0) { %>\
                <h2 class="subtitle"><%= tempNode.textContent %></h2>\
            <% } %>\
        <% } %>\
        <% if (settings["metadata-abstract"] && metadata.abstract) { %>\
            <% tempNode = exporter.obj2Node(metadata.abstract); %>\
            <% if (tempNode.textContent.length > 0) { %>\
                <div class="abstract"><%= tempNode.textContent %></div>\
            <% } %>\
        <% } %>\
        <% if (settings["metadata-authors"] && metadata.authors) { %>\
            <% tempNode = exporter.obj2Node(metadata.authors); %>\
            <% if (tempNode.textContent.length > 0) { %>\
                <div class="authors"><%= tempNode.textContent %></div>\
            <% } %>\
        <% } %>\
        <% if (settings["metadata-keywords"] && metadata.keywords) { %>\
            <% tempNode = exporter.obj2Node(metadata.keywords); %>\
            <% if (tempNode.textContent.length > 0) { %>\
                <div class="keywords"><%= tempNode.textContent %></div>\
            <% } %>\
        <% } %>\
        <%= contents %></body></html>');

},{}],6:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.getMathjaxHeader = exports.replaceImgSrc = exports.cleanHTML = exports.downloadHtml = undefined;

var _json = require("./json");

var _tools = require("./tools");

var _zip = require("./zip");

var _htmlTemplates = require("./html-templates");

var downloadHtml = exports.downloadHtml = function downloadHtml(aDocument) {
    if (window.hasOwnProperty('theEditor') || window.hasOwnProperty('BibDB') && aDocument.is_owner) {
        export1(aDocument, BibDB);
    } else if (aDocument.is_owner) {
        bibliographyHelpers.getBibDB(function () {
            export1(aDocument, BibDB);
        });
    } else {
        bibliographyHelpers.getABibDB(aDocument.owner, function (aBibDB) {
            export1(aDocument, aBibDB);
        });
    }
};

var export1 = function export1(aDocument, aBibDB) {
    var styleSheets = [],
        mathjax = false;

    var title = aDocument.title;

    $.addAlert('info', title + ': ' + gettext('HTML export has been initiated.'));

    var contents = document.createElement('div');

    var tempNode = (0, _json.obj2Node)(aDocument.contents);

    while (tempNode.firstChild) {
        contents.appendChild(tempNode.firstChild);
    }

    var equations = contents.querySelectorAll('.equation');

    var figureEquations = contents.querySelectorAll('.figure-equation');

    if (equations.length > 0 || figureEquations.length > 0) {
        mathjax = true;
    }

    for (var i = 0; i < equations.length; i++) {
        mathHelpers.layoutMathNode(equations[i]);
    }
    for (var i = 0; i < figureEquations.length; i++) {
        mathHelpers.layoutDisplayMathNode(figureEquations[i]);
    }

    mathHelpers.queueExecution(function () {
        export2(aDocument, aBibDB, styleSheets, title, contents, mathjax);
    });
};

var export2 = function export2(aDocument, aBibDB, styleSheets, title, contents, mathjax) {

    var includeZips = [];

    if (mathjax) {
        mathjax = getMathjaxHeader();

        if (mathjax) {
            mathjax = mathjax.outerHTML;
        }
    }

    var bibliography = citationHelpers.formatCitations(contents, aDocument.settings.citationstyle, aBibDB);

    if (bibliography.length > 0) {
        contents.innerHTML += bibliography;
    }

    var httpOutputList = (0, _tools.findImages)(contents);

    contents = cleanHTML(contents);

    var contentsCode = replaceImgSrc(contents.innerHTML);

    var htmlCode = (0, _htmlTemplates.htmlExportTemplate)({
        part: false,
        title: title,
        metadata: aDocument.metadata,
        settings: aDocument.settings,
        styleSheets: styleSheets,
        contents: contentsCode,
        mathjax: mathjax
    });

    var outputList = [{
        filename: 'document.html',
        contents: htmlCode
    }];

    outputList = outputList.concat(styleSheets);

    if (mathjax) {
        includeZips.push({
            'directory': '',
            'url': mathjaxZipUrl
        });
    }
    (0, _zip.zipFileCreator)(outputList, httpOutputList, (0, _tools.createSlug)(title) + '.html.zip', false, includeZips);
};

var cleanHTML = exports.cleanHTML = function cleanHTML(htmlCode) {
    // Replace nbsp spaces with normal ones
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/&nbsp;/g, ' ');

    jQuery(htmlCode).find('.del').each(function () {
        this.outerHTML = '';
    });

    jQuery(htmlCode).find('.citation,.ins').each(function () {
        this.outerHTML = this.innerHTML;
    });

    jQuery(htmlCode).find('script').each(function () {
        this.outerHTML = '';
    });

    jQuery(htmlCode).find('figcaption .figure-cat-figure').each(function (index) {
        this.innerHTML += ' ' + (index + 1) + ': ';
    });

    jQuery(htmlCode).find('figcaption .figure-cat-photo').each(function (index) {
        this.innerHTML += ' ' + (index + 1) + ': ';
    });

    jQuery(htmlCode).find('figcaption .figure-cat-table').each(function (index) {
        this.innerHTML += ' ' + (index + 1) + ': ';
    });
    return htmlCode;
};

var replaceImgSrc = exports.replaceImgSrc = function replaceImgSrc(htmlString) {
    htmlString = htmlString.replace(/<(img|IMG) data-src([^>]+)>/gm, "<$1 src$2>");
    return htmlString;
};

// Mathjax automatically adds some elements to the current document after making SVGs. We need these elements.
var getMathjaxHeader = exports.getMathjaxHeader = function getMathjaxHeader() {
    var mathjax = document.getElementById('MathJax_SVG_Hidden');
    if (mathjax === undefined || mathjax === null) {
        return false;
    } else {
        return mathjax.parentElement;
    }
};

},{"./html-templates":5,"./json":7,"./tools":10,"./zip":13}],7:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
/** Same functionality as objToNode/nodeToObj in diffDOM.js, but also offers output in XHTML format (obj2Node) and without form support. */
var obj2Node = exports.obj2Node = function obj2Node(obj, docType) {
    var parser = undefined;
    if (obj === undefined) {
        return false;
    }
    if (docType === 'xhtml') {
        parser = new DOMParser().parseFromString('<xml/>', "text/xml");
    } else {
        parser = document;
    }

    function inner(obj, insideSvg) {
        var node = undefined;
        if (obj.hasOwnProperty('t')) {
            node = parser.createTextNode(obj.t);
        } else if (obj.hasOwnProperty('co')) {
            node = parser.createComment(obj.co);
        } else {
            if (obj.nn === 'svg' || insideSvg) {
                node = parser.createElementNS('http://www.w3.org/2000/svg', obj.nn);
                insideSvg = true;
            } else if (obj.nn === 'script') {
                // Do not allow scripts
                return parser.createTextNode('');
            } else {
                node = parser.createElement(obj.nn);
            }
            if (obj.a) {
                for (var i = 0; i < obj.a.length; i++) {
                    node.setAttribute(obj.a[i][0], obj.a[i][1]);
                }
            }
            if (obj.c) {
                for (var i = 0; i < obj.c.length; i++) {
                    node.appendChild(inner(obj.c[i], insideSvg));
                }
            }
        }
        return node;
    }
    return inner(obj);
};

var node2Obj = exports.node2Obj = function node2Obj(node) {
    var obj = {};

    if (node.nodeType === 3) {
        obj.t = node.data;
    } else if (node.nodeType === 8) {
        obj.co = node.data;
    } else {
        obj.nn = node.nodeName;
        if (node.attributes && node.attributes.length > 0) {
            obj.a = [];
            for (var i = 0; i < node.attributes.length; i++) {
                obj.a.push([node.attributes[i].name, node.attributes[i].value]);
            }
        }
        if (node.childNodes && node.childNodes.length > 0) {
            obj.c = [];
            for (var i = 0; i < node.childNodes.length; i++) {
                if (node.childNodes[i]) {
                    obj.c.push(node2Obj(node.childNodes[i]));
                }
            }
        }
    }
    return obj;
};

},{}],8:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.downloadLatex = exports.htmlToLatex = exports.findLatexDocumentFeatures = undefined;

var _json = require("./json");

var _tools = require("./tools");

var _zip = require("./zip");

var findLatexDocumentFeatures = exports.findLatexDocumentFeatures = function findLatexDocumentFeatures(htmlCode, title, author, subtitle, keywords, specifiedAuthors, metadata, documentClass) {
    var documentEndCommands = '';

    var includePackages = "\\usepackage[utf8]{luainputenc}";

    if (subtitle && metadata.subtitle) {
        var tempNode = (0, _json.obj2Node)(metadata.subtitle);
        if (tempNode.textContent.length > 0) {
            includePackages += "\n\\usepackage{titling}                \n\\newcommand{\\subtitle}[1]{%                \n\t\\posttitle{%                \n\t\t\\par\\end{center}                \n\t\t\\begin{center}\\large#1\\end{center}                \n\t\t\\vskip 0.5em}%                \n}";
        }
    }

    if (keywords && metadata.keywords) {
        var tempNode = (0, _json.obj2Node)(metadata.keywords);
        if (tempNode.textContent.length > 0) {
            includePackages += '\n\\def\\keywords{\\vspace{.5em}\
                \n{\\textit{Keywords}:\\,\\relax%\
                \n}}\
                \n\\def\\endkeywords{\\par}';
        }
    }

    if (jQuery(htmlCode).find('a').length > 0) {
        includePackages += "\n\\usepackage{hyperref}";
    }
    if (jQuery(htmlCode).find('.citation').length > 0) {
        includePackages += "\n\\usepackage[backend=biber,hyperref=false,citestyle=authoryear,bibstyle=authoryear]{biblatex}\n\\bibliography{bibliography}";
        documentEndCommands += '\n\n\\printbibliography';
    }

    if (jQuery(htmlCode).find('figure').length > 0) {
        if (htmlCode.innerHTML.search('.svg">') !== -1) {
            includePackages += "\n\\usepackage{svg}";
        }
        if (htmlCode.innerHTML.search('.png">') !== -1 || htmlCode.innerHTML.search('.jpg">') !== -1 || htmlCode.innerHTML.search('.jpeg">') !== -1) {
            includePackages += "\n\\usepackage{graphicx}";
            // The following scales graphics down to text width, but not scaling them up if they are smaller
            includePackages += "\n\\usepackage{calc}\n\\newlength{\\imgwidth}\n\\newcommand\\scaledgraphics[1]{%\n\\settowidth{\\imgwidth}{\\includegraphics{#1}}%\n\\setlength{\\imgwidth}{\\minof{\\imgwidth}{\\textwidth}}%\n\\includegraphics[width=\\imgwidth,height=\\textheight,keepaspectratio]{#1}%\n}";
        }
    }
    if (documentClass === 'book') {
        //TODO: abstract environment should possibly only be included if used
        includePackages += '\n\\newenvironment{abstract}{\\rightskip1in\\itshape}{}';
    }

    var latexStart = '\\documentclass{' + documentClass + '}\n' + includePackages + '\n\\begin{document}\n\n\\title{' + title + '}';

    if (specifiedAuthors && metadata.authors) {
        var tempNode = (0, _json.obj2Node)(metadata.authors);
        if (tempNode.textContent.length > 0) {
            author = tempNode.textContent;
        }
    }

    latexStart += '\n\\author{' + author + '}\n';

    if (subtitle && metadata.subtitle) {
        var tempNode = (0, _json.obj2Node)(metadata.subtitle);
        if (tempNode.textContent.length > 0) {
            latexStart += '\\subtitle{' + tempNode.textContent + '}\n';
        }
    }

    latexStart += '\n\\maketitle\n\n';

    if (keywords && metadata.keywords) {
        var tempNode = (0, _json.obj2Node)(metadata.keywords);
        if (tempNode.textContent.length > 0) {
            latexStart += '\\begin{keywords}\n' + tempNode.textContent + '\\end{keywords}\n';
        }
    }

    if (documentClass === 'book') {
        if (metadata.publisher) {
            var tempNode = (0, _json.obj2Node)(metadata.publisher);
            if (tempNode.textContent.length > 0) {
                latexStart += tempNode.textContent + '\n\n';
            }
        }

        if (metadata.copyright) {
            var tempNode = (0, _json.obj2Node)(metadata.copyright);
            if (tempNode.textContent.length > 0) {
                latexStart += tempNode.textContent + '\n\n';
            }
        }

        latexStart += '\n\\tableofcontents';
    }

    var latexEnd = documentEndCommands + '\n\n\\end{document}';

    return {
        latexStart: latexStart,
        latexEnd: latexEnd
    };
};

var htmlToLatex = exports.htmlToLatex = function htmlToLatex(title, author, htmlCode, aBibDB, settings, metadata, isChapter, listedWorksList) {
    var latexStart = '',
        latexEnd = '';
    if (!listedWorksList) {
        listedWorksList = [];
    }

    // Remove sections that are marked as deleted
    /*jQuery(htmlCode).find('.del').each(function() {
        this.outerHTML = ''
    })*/

    if (isChapter) {
        latexStart += '\\chapter{' + title + '}\n';
        //htmlCode.innerHTML =  '<div class="title">' + title + '</div>' + htmlCode.innerHTML
        if (settings['metadata-subtitle'] && metadata.subtitle) {
            var tempNode = (0, _json.obj2Node)(metadata.subtitle);
            if (tempNode.textContent.length > 0) {
                latexStart += '\\section{' + tempNode.textContent + '}\n';
            }
        }
    } else {
        var documentFeatures = findLatexDocumentFeatures(htmlCode, title, author, settings['metadata-subtitle'], settings['metadata-keywords'], settings['metadata-authors'], metadata, 'article');
        latexStart += documentFeatures.latexStart;
        latexEnd += documentFeatures.latexEnd;
    }

    if (settings['metadata-abstract'] && metadata.abstract) {
        var tempNode = (0, _json.obj2Node)(metadata.abstract);
        if (tempNode.textContent.length > 0) {

            htmlCode.innerHTML = '<div class="abstract">' + tempNode.innerHTML + '</div>' + htmlCode.innerHTML;
        }
    }
    // Replace the footnotes with markers and the footnotes to the back of the
    // document, so they can survive the normalization that happens when
    // assigning innerHTML.
    var footnotes = [].slice.call(htmlCode.querySelectorAll('.footnote'));
    var footnotesContainer = document.createElement('div');
    footnotesContainer.id = 'footnotes-container';

    footnotes.forEach(function (footnote) {
        var footnoteMarker = document.createElement('span');
        footnoteMarker.classList.add('footnote-marker');
        footnote.parentNode.replaceChild(footnoteMarker, footnote);
        footnotesContainer.appendChild(footnote);
    });
    htmlCode.appendChild(footnotesContainer);

    /*let footnoteMarkersInHeaders = [].slice.call(htmlCode.querySelectorAll(
      'h1 .footnote-marker, h2 .footnote-marker, h3 .footnote-marker, ul .footnote-marker, ol .footnote-marker'
    )
     footnoteMarkersInHeaders.forEach(function (marker) {
        marker.classList.add('keep')
    })*/

    // Replace nbsp spaces with normal ones
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/&nbsp;/g, ' ');

    // Remove line breaks
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/(\r\n|\n|\r)/gm, '');

    // Escape characters that are protected in some way.
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\\/g, '\\\\');
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\{/g, '\{');
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\}/g, '\}');
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\$/g, '\\\$');
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\#/g, '\\\#');
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\%/g, '\\\%');

    jQuery(htmlCode).find('i').each(function () {
        jQuery(this).replaceWith('\\emph{' + this.innerHTML + '}');
    });

    jQuery(htmlCode).find('b').each(function () {
        jQuery(this).replaceWith('\\textbf{' + this.innerHTML + '}');
    });

    jQuery(htmlCode).find('h1').each(function () {
        jQuery(this).replaceWith('<h1>\n\n\\section{' + this.innerHTML + '}\n</h1>');
    });
    jQuery(htmlCode).find('h2').each(function () {
        jQuery(this).replaceWith('<h2>\n\n\\subsection{' + this.innerHTML + '}\n</h2>');
    });
    jQuery(htmlCode).find('h3').each(function () {
        jQuery(this).replaceWith('<h3>\n\n\\subsubsection{' + this.textHTML + '}\n</h3>');
    });
    jQuery(htmlCode).find('p').each(function () {
        jQuery(this).replaceWith('\n\n' + this.innerHTML + '\n');
    });
    jQuery(htmlCode).find('li').each(function () {
        jQuery(this).replaceWith('\n\\item ' + this.innerHTML + '\n');
    });
    jQuery(htmlCode).find('ul').each(function () {
        jQuery(this).replaceWith('<ul>\n\\begin{itemize}' + this.innerHTML + '\\end{itemize}\n</ul>');
    });
    jQuery(htmlCode).find('ol').each(function () {
        jQuery(this).replaceWith('<ol>\n\\begin{enumerated}' + this.innerHTML + '\\end{enumerated}\n</ol>');
    });
    jQuery(htmlCode).find('code').each(function () {
        jQuery(this).replaceWith('\n\\begin{code}\n\n' + this.innerHTML + '\n\n\\end{code}\n');
    });
    jQuery(htmlCode).find('div.abstract').each(function () {
        jQuery(this).replaceWith('\n\\begin{abstract}\n\n' + this.innerHTML + '\n\n\\end{abstract}\n');
    });

    // join code paragraphs that follow oneanother
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\\end{code}\n\n\\begin{code}\n\n/g, '');
    jQuery(htmlCode).find('blockquote').each(function () {
        jQuery(this).replaceWith('\n\\begin{quote}\n\n' + this.innerHTML + '\n\n\\end{quote}\n');
    });
    // join quote paragraphs that follow oneanother
    htmlCode.innerHTML = htmlCode.innerHTML.replace(/\\end{quote}\n\n\\begin{quote}\n\n/g, '');
    jQuery(htmlCode).find('a').each(function () {
        jQuery(this).replaceWith('\\href{' + this.href + '}{' + this.innerHTML + '}');
    });
    jQuery(htmlCode).find('.citation').each(function () {
        var citationEntries = this.hasAttribute('data-bib-entry') ? this.getAttribute('data-bib-entry').split(',') : [],
            citationBefore = this.hasAttribute('data-bib-before') ? this.getAttribute('data-bib-before').split(',') : [],
            citationPage = this.hasAttribute('data-bib-page') ? this.getAttribute('data-bib-page').split(',') : [],
            citationFormat = this.hasAttribute('data-bib-format') ? this.getAttribute('data-bib-format') : '',
            citationCommand = '\\' + citationFormat;

        if (citationEntries.length > 1 && citationBefore.join('').length === 0 && citationPage.join('').length === 0) {
            (function () {
                // multi source citation without page numbers or text before.
                var citationEntryKeys = [];

                citationEntries.forEach(function (citationEntry) {
                    if (aBibDB[citationEntry]) {
                        citationEntryKeys.push(aBibDB[citationEntry].entry_key);
                        if (listedWorksList.indexOf(citationEntry) === -1) {
                            listedWorksList.push(citationEntry);
                        }
                    }
                });

                citationCommand += '{' + citationEntryKeys.join(',') + '}';
            })();
        } else {
            if (citationEntries.length > 1) {
                citationCommand += 's'; // Switching from \autocite to \autocites
            }

            citationEntries.forEach(function (citationEntry, index) {
                if (!aBibDB[citationEntry]) {
                    return false; // Not present in bibliography database, skip it.
                }

                if (citationBefore[index] && citationBefore[index].length > 0) {
                    citationCommand += '[' + citationBefore[index] + ']';
                    if (!citationPage[index] || citationPage[index].length === 0) {
                        citationCommand += '[]';
                    }
                }
                if (citationPage[index] && citationPage[index].length > 0) {
                    citationCommand += '[' + citationPage[index] + ']';
                }
                citationCommand += '{';

                citationCommand += aBibDB[citationEntry].entry_key;

                if (listedWorksList.indexOf(citationEntry) === -1) {
                    listedWorksList.push(citationEntry);
                }
                citationCommand += '}';
            });
        }

        jQuery(this).replaceWith(citationCommand);
    });

    jQuery(htmlCode).find('figure').each(function () {
        var latexPackage = undefined;
        var figureType = jQuery(this).find('figcaption')[0].firstChild.innerHTML;
        // TODO: make use of figure type
        var caption = jQuery(this).find('figcaption')[0].lastChild.innerHTML;
        var filename = jQuery(this).find('img').attr('data-src');
        var filenameList = filename.split('.');
        if (filenameList[filenameList.length - 1] === 'svg') {
            latexPackage = 'includesvg';
        } else {
            latexPackage = 'scaledgraphics';
        }
        this.outerHTML = '\n\\begin{figure}\n\\' + latexPackage + '{' + filename + '}\n\\caption{' + caption + '}\n\\end{figure}\n';
    });

    jQuery(htmlCode).find('.equation, .figure-equation').each(function () {
        var equation = jQuery(this).attr('data-equation');
        // TODO: The string is for some reason escaped. The following line removes this.
        equation = equation.replace(/\\/g, "*BACKSLASH*").replace(/\*BACKSLASH\*\*BACKSLASH\*/g, "\\").replace(/\*BACKSLASH\*/g, "");
        this.outerHTML = '$' + equation + '$';
    });

    footnotes = [].slice.call(htmlCode.querySelectorAll('.footnote'));
    var footnoteMarkers = [].slice.call(htmlCode.querySelectorAll('.footnote-marker'));

    footnoteMarkers.forEach(function (marker, index) {
        // if the footnote is in one of these containers, we have to put the
        // footnotetext after the containers. If there is no container, we put the
        // footnote where the footnote marker is.
        var containers = [].slice.call(jQuery(marker).parents('h1, h2, h3, ul, ol'));
        if (containers.length > 0) {
            jQuery(marker).html('\\protect\\footnotemark');
            var lastContainer = containers.pop();
            if (!lastContainer.nextSibling || !jQuery(lastContainer.nextSibling).hasClass('footnote-counter-reset')) {
                var fnCounterReset = document.createElement('span');
                fnCounterReset.classList.add('footnote-counter-reset');
                lastContainer.parentNode.insertBefore(fnCounterReset, lastContainer.nextSibling);
            }
            var fnCounter = 1;
            var searchNode = lastContainer.nextSibling.nextSibling;
            while (searchNode && searchNode.nodeType === 1 && jQuery(searchNode).hasClass('footnote')) {
                searchNode = searchNode.nextSibling;
                fnCounter++;
            }
            footnotes[index].innerHTML = "\\stepcounter{footnote}\\footnotetext{" + footnotes[index].innerHTML.trim() + "}";
            lastContainer.parentNode.insertBefore(footnotes[index], searchNode);
            lastContainer.nextSibling.innerHTML = "\\addtocounter{footnote}{-" + fnCounter + "}";
        } else {
            footnotes[index].innerHTML = "\\footnote{" + footnotes[index].innerHTML.trim() + "}";
            marker.appendChild(footnotes[index]);
        }
    });

    /*jQuery(htmlCode).find('.footnote').each(function() {
        jQuery(this).replaceWith('\\footnotext{' + this.innerHTML + '}')
    })*/

    var returnObject = {
        latex: latexStart + htmlCode.textContent + latexEnd
    };
    if (isChapter) {
        returnObject.listedWorksList = listedWorksList;
    } else {
        var bibExport = new bibliographyHelpers.bibLatexExport(listedWorksList, aBibDB);
        returnObject.bibtex = bibExport.bibtex_str;
    }
    return returnObject;
};

var downloadLatex = exports.downloadLatex = function downloadLatex(aDocument) {
    if (window.hasOwnProperty('theEditor') || window.hasOwnProperty('BibDB') && aDocument.is_owner) {
        export1(aDocument, BibDB);
    } else if (aDocument.is_owner) {
        bibliographyHelpers.getBibDB(function () {
            export1(aDocument, BibDB);
        });
    } else {
        bibliographyHelpers.getABibDB(aDocument.owner, function (aBibDB) {
            export1(aDocument, aBibDB);
        });
    }
};

var export1 = function export1(aDocument, aBibDB) {
    var title = aDocument.title;

    $.addAlert('info', title + ': ' + gettext('Latex export has been initiated.'));

    var contents = document.createElement('div');

    var tempNode = (0, _json.obj2Node)(aDocument.contents);

    while (tempNode.firstChild) {
        contents.appendChild(tempNode.firstChild);
    }

    var httpOutputList = (0, _tools.findImages)(contents);

    var latexCode = htmlToLatex(title, aDocument.owner.name, contents, aBibDB, aDocument.settings, aDocument.metadata);

    var outputList = [{
        filename: 'document.tex',
        contents: latexCode.latex
    }];

    if (latexCode.bibtex.length > 0) {
        outputList.push({
            filename: 'bibliography.bib',
            contents: latexCode.bibtex
        });
    }

    (0, _zip.zipFileCreator)(outputList, httpOutputList, (0, _tools.createSlug)(title) + '.latex.zip');
};

},{"./json":7,"./tools":10,"./zip":13}],9:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.exportNative = exports.downloadNative = exports.uploadNative = undefined;

var _json = require("./json");

var _tools = require("./tools");

var _zip = require("./zip");

/** The current Fidus Writer filetype version.
 * The importer will not import from a different version and the exporter
  * will include this number in all exports.
 */
var FW_FILETYPE_VERSION = "1.2";

/** Create a Fidus Writer document and upload it to the server as a backup.
 * @function uploadNative
 * @param aDocument The document to turn into a Fidus Writer document and upload.
 */
var uploadNative = exports.uploadNative = function uploadNative(aDocument) {
    exportNative(aDocument, ImageDB, BibDB, function (aDocument, shrunkImageDB, shrunkBibDB, images) {
        exportNativeFile(aDocument, shrunkImageDB, shrunkBibDB, images, true);
    });
};

var downloadNative = exports.downloadNative = function downloadNative(aDocument) {
    if (window.hasOwnProperty('theEditor')) {
        exportNative(aDocument, ImageDB, BibDB, exportNativeFile);
    } else {
        if (aDocument.is_owner) {
            if ('undefined' === typeof BibDB) {
                bibliographyHelpers.getBibDB(function () {
                    if ('undefined' === typeof ImageDB) {
                        usermediaHelpers.getImageDB(function () {
                            exportNative(aDocument, ImageDB, BibDB, exportNativeFile);
                        });
                    } else {
                        exportNative(aDocument, ImageDB, BibDB, exportNativeFile);
                    }
                });
            } else if ('undefined' === typeof ImageDB) {
                usermediaHelpers.getImageDB(function () {
                    exportNative(aDocument, ImageDB, BibDB, exportNativeFile);
                });
            } else {
                exportNative(aDocument, ImageDB, BibDB, exporter.nativeFile);
            }
        } else {
            bibliographyHelpers.getABibDB(aDocument.owner, function (aBibDB) {
                usermediaHelpers.getAnImageDB(aDocument.owner, function (anImageDB) {
                    exportNative(aDocument, anImageDB, aBibDB, exportNativeFile);
                });
            });
        }
    }
};

var exportNative = exports.exportNative = function exportNative(aDocument, anImageDB, aBibDB, callback) {
    var shrunkBibDB = {},
        citeList = [];

    $.addAlert('info', gettext('File export has been initiated.'));

    var contents = (0, _json.obj2Node)(aDocument.contents);

    var images = (0, _tools.findImages)(contents);

    var imageUrls = _.pluck(images, 'url');

    var shrunkImageDB = _.filter(anImageDB, function (image) {
        return imageUrls.indexOf(image.image.split('?').shift()) !== -1;
    });

    jQuery(contents).find('.citation').each(function () {
        citeList.push(jQuery(this).attr('data-bib-entry'));
    });

    citeList = _.uniq(citeList.join(',').split(','));

    if (citeList.length === 1 && citeList[0] === '') {
        citeList = [];
    }

    for (var i in citeList) {
        shrunkBibDB[citeList[i]] = aBibDB[citeList[i]];
    }

    callback(aDocument, shrunkImageDB, shrunkBibDB, images);
};

var exportNativeFile = function exportNativeFile(aDocument, shrunkImageDB, shrunkBibDB, images, upload) {

    if ('undefined' === typeof upload) {
        upload = false;
    }

    var httpOutputList = images;

    var outputList = [{
        filename: 'document.json',
        contents: JSON.stringify(aDocument)
    }, {
        filename: 'images.json',
        contents: JSON.stringify(shrunkImageDB)
    }, {
        filename: 'bibliography.json',
        contents: JSON.stringify(shrunkBibDB)
    }, {
        filename: 'filetype-version',
        contents: FW_FILETYPE_VERSION
    }];

    (0, _zip.zipFileCreator)(outputList, httpOutputList, (0, _tools.createSlug)(aDocument.title) + '.fidus', 'application/fidus+zip', false, upload);
};

},{"./json":7,"./tools":10,"./zip":13}],10:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
var createSlug = exports.createSlug = function createSlug(str) {
    str = str.replace(/[^a-zA-Z0-9\s]/g, "");
    str = str.toLowerCase();
    str = str.replace(/\s/g, '-');
    return str;
};

var findImages = exports.findImages = function findImages(htmlCode) {
    var imageLinks = jQuery(htmlCode).find('img'),
        images = [];

    imageLinks.each(function (index) {
        var src = jQuery(this).attr('src').split('?')[0];
        var name = src.split('/').pop();
        // JPGs are output as PNG elements as well.
        if (name === '') {
            // name was not retrievable so we give the image a unique numerical name like 1.png, 2.jpg, 3.svg, etc. .
            name = index;
        }

        var newImg = document.createElement('img');
        // We set the src of the image as "data-src" for now so that the browser won't try to load the file immediately
        newImg.setAttribute('data-src', name);
        this.parentNode.replaceChild(newImg, this);

        if (!_.findWhere(images, {
            'filename': name
        })) {

            images.push({
                'filename': name,
                'url': src
            });
        }
    });

    return images;
};

},{}],11:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
/** Dialog to add a note to a revision before saving. */
var revisionDialogTemplate = exports.revisionDialogTemplate = _.template('\
<div title="' + gettext('Revision description') + '"><p><input type="text" class="revision-note" placeholder="' + gettext('Description (optional)') + '"></p></div>');

},{}],12:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.uploadFile = undefined;

var _uploadTemplates = require("./upload-templates");

/** Uploads a Fidus Writer document to the server.
 * @function uploadFile
 * @param {string} zipFileName The name of the file.
 * @param {blob} blob The contents of the file.
 */
var uploadFile = exports.uploadFile = function uploadFile(zipFilename, blob) {

    var diaButtons = {};

    diaButtons[gettext("Save")] = function () {
        var data = new FormData();

        data.append('note', jQuery(this).find('.revision-note').val());
        data.append('file', blob, zipFilename);
        data.append('document_id', theEditor.doc.id);

        jQuery.ajax({
            url: '/document/upload/',
            data: data,
            type: 'POST',
            cache: false,
            contentType: false,
            processData: false,
            success: function success() {
                jQuery.addAlert('success', gettext('Revision saved'));
            },
            error: function error() {
                jQuery.addAlert('error', gettext('Revision could not be saved.'));
            }
        });
        jQuery(this).dialog("close");
    };

    diaButtons[gettext("Cancel")] = function () {
        jQuery(this).dialog("close");
    };

    jQuery((0, _uploadTemplates.revisionDialogTemplate)()).dialog({
        autoOpen: true,
        height: 180,
        width: 300,
        modal: true,
        buttons: diaButtons,
        create: function create() {
            var theDialog = jQuery(this).closest(".ui-dialog");
            theDialog.find(".ui-button:first-child").addClass("fw-button fw-dark");
            theDialog.find(".ui-button:last").addClass("fw-button fw-orange");
        }
    });
};

},{"./upload-templates":11}],13:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.zipFileCreator = undefined;

var _download = require("./download");

var _upload = require("./upload");

/** Creates a zip file.
 * @function zipFileCreator
 * @param {list} textFiles A list of files in plain text format.
 * @param {list} httpFiles A list fo files that have to be downloaded from the internet before being included.
 * @param {string} zipFileName The name of the zip file to be created
 * @param {string} [mimeType=application/zip] The mimetype of the file that is to be created.
 * @param {list} includeZips A list of zip files to be merged into the output zip file.
 * @param {boolean} [upload=false] Whether to upload rather than downloading the Zip file once finished.
 */

var zipFileCreator = exports.zipFileCreator = function zipFileCreator(textFiles, httpFiles, zipFileName, mimeType, includeZips, upload) {
    var zipFs = new zip.fs.FS(),
        zipDir = undefined;

    if (mimeType) {
        zipFs.root.addText('mimetype', mimeType);
    } else {
        mimeType = 'application/zip';
    }

    var createZip = function createZip() {
        for (var i = 0; i < textFiles.length; i++) {

            zipFs.root.addText(textFiles[i].filename, textFiles[i].contents);
        }

        for (var i = 0; i < httpFiles.length; i++) {

            zipFs.root.addHttpContent(httpFiles[i].filename, httpFiles[i].url);
        }

        zip.createWriter(new zip.BlobWriter(mimeType), function (writer) {

            var currentIndex = 0;

            function process(zipWriter, entry, onend, onprogress, totalSize) {
                var childIndex = 0;

                function exportChild() {
                    var child = entry.children[childIndex],
                        level = 9,
                        reader = null;

                    if (child) {
                        if (child.getFullname() === 'mimetype') {
                            level = 0; // turn compression off for mimetype file
                        }
                        if (child.hasOwnProperty('Reader')) {
                            reader = new child.Reader(child.data);
                        }

                        zipWriter.add(child.getFullname(), reader, function () {
                            currentIndex += child.uncompressedSize || 0;
                            process(zipWriter, child, function () {
                                childIndex++;
                                exportChild();
                            }, onprogress, totalSize);
                        }, function (index) {
                            if (onprogress) onprogress(currentIndex + index, totalSize);
                        }, {
                            directory: child.directory,
                            version: child.zipVersion,
                            level: level
                        });
                    } else {
                        onend();
                    }
                }

                exportChild();
            }

            process(writer, zipFs.root, function () {
                writer.close(function (blob) {
                    if (upload) {
                        (0, _upload.uploadFile)(zipFileName, blob);
                    } else {
                        (0, _download.downloadFile)(zipFileName, blob);
                    }
                });
            });
        });
    };

    if (includeZips) {
        (function () {
            var i = 0;
            var includeZipLoop = function includeZipLoop() {
                // for (i = 0; i < includeZips.length; i++) {
                if (i === includeZips.length) {
                    createZip();
                } else {
                    if (includeZips[i].directory === '') {
                        zipDir = zipFs.root;
                    } else {
                        zipDir = zipFs.root.addDirectory(includeZips[i].directory);
                    }
                    zipDir.importHttpContent(includeZips[i].url, false, function () {
                        i++;
                        includeZipLoop();
                    });
                }
            };
            includeZipLoop();
        })();
    } else {
        createZip();
    }
};

},{"./download":2,"./upload":12}],14:[function(require,module,exports){
"use strict";

var _copy = require("./es6_modules/exporter/copy");

var _download = require("./es6_modules/exporter/download");

var _epub = require("./es6_modules/exporter/epub");

var _html = require("./es6_modules/exporter/html");

var _json = require("./es6_modules/exporter/json");

var _latex = require("./es6_modules/exporter/latex");

var _native = require("./es6_modules/exporter/native");

var _tools = require("./es6_modules/exporter/tools");

var _zip = require("./es6_modules/exporter/zip");

var _epubTemplates = require("./es6_modules/exporter/epub-templates");

var _htmlTemplates = require("./es6_modules/exporter/html-templates");

/**
 * Functions to export the Fidus Writer document.
 */
var exporter = {};
exporter.opfMathjaxItemsTemplatePart = _epubTemplates.opfMathjaxItemsTemplatePart;
exporter.opfCssItemTemplatePart = _epubTemplates.opfCssItemTemplatePart;
exporter.opfImageItemTemplatePart = _epubTemplates.opfImageItemTemplatePart;
exporter.opfTemplate = _epubTemplates.opfTemplate;
exporter.containerTemplate = _epubTemplates.containerTemplate;
exporter.ncxTemplate = _epubTemplates.ncxTemplate;
exporter.ncxItemTemplate = _epubTemplates.ncxItemTemplate;
exporter.xhtmlTemplate = _epubTemplates.xhtmlTemplate;
exporter.navTemplate = _epubTemplates.navTemplate;
exporter.navItemTemplate = _epubTemplates.navItemTemplate;
exporter.mathjaxHtmlHeaderTemplatePart = _htmlTemplates.mathjaxHtmlHeaderTemplatePart;
exporter.htmlExportTemplate = _htmlTemplates.htmlExportTemplate;

exporter.savecopy = _copy.savecopy;
exporter.downloadFile = _download.downloadFile;
exporter.styleEpubFootnotes = _epub.styleEpubFootnotes;
exporter.getTimestamp = _epub.getTimestamp;
exporter.downloadEpub = _epub.downloadEpub;
exporter.setLinks = _epub.setLinks;
exporter.orderLinks = _epub.orderLinks;
exporter.downloadHtml = _html.downloadHtml;
exporter.cleanHTML = _html.cleanHTML;
exporter.replaceImgSrc = _html.replaceImgSrc;
exporter.getMathjaxHeader = _html.getMathjaxHeader;
exporter.obj2Node = _json.obj2Node;
exporter.node2Obj = _json.node2Obj;
exporter.findLatexDocumentFeatures = _latex.findLatexDocumentFeatures;
exporter.htmlToLatex = _latex.htmlToLatex;
exporter.downloadLatex = _latex.downloadLatex;
exporter.downloadNative = _native.downloadNative;
exporter.createSlug = _tools.createSlug;
exporter.findImages = _tools.findImages;
exporter.zipFileCreator = _zip.zipFileCreator;

window.exporter = exporter;

},{"./es6_modules/exporter/copy":1,"./es6_modules/exporter/download":2,"./es6_modules/exporter/epub":4,"./es6_modules/exporter/epub-templates":3,"./es6_modules/exporter/html":6,"./es6_modules/exporter/html-templates":5,"./es6_modules/exporter/json":7,"./es6_modules/exporter/latex":8,"./es6_modules/exporter/native":9,"./es6_modules/exporter/tools":10,"./es6_modules/exporter/zip":13}]},{},[14]);
