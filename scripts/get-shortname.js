var TR_URL = "http://www.w3.org/TR/";

var SPECIAL_CASES = {
    'http://www.w3.org/Search/9605-Indexing-Workshop/ReportOutcomes/S6Group2': "S6Group2",
    'http://www.w3.org/TR/1998/NOTE-P3P10-Protocols': "P3P10-Protocols",
    'http://www.w3.org/1999/05/WCA-terms/': "WCA-terms",
    'http://www.w3.org/TR/1998/WD-HTTP-NG-goals': "HTTP-NG-goals",
    'http://www.w3.org/TR/REC-html32': "HTML32",
    'http://www.w3.org/TR/2001/WD-xhtml1-20011004/': 'xhtml1'
};

var SHORT_NAME_SPECIAL_CASES = {
    "NOTE-CSS-potential": "CSS-potential",
    "NOTE-P3P10-principles": "P3P10-principles",
    "NOTE-SYMM-modules": "SYMM-modules",
    "NOTE-XML-FRAG-REQ": "XML-FRAG-REQ",
    "NOTE-html-lan": "html-lan",
    "NOTE-voice": "voice",
    "NOTE-xh": "xh",
    "NOTE-xlink-principles": "xlink-principles",
    "NOTE-xml-canonical-req": "xml-canonical-req",
    "NOTE-xml-infoset-req": "xml-infoset-req",
    "NOTE-xml-schema-req": "xml-schema-req",
    "NOTE-xptr-infoset-liaison": "xptr-infoset-liaison",
    "NOTE-xptr-req": "xptr-req",
    "NOTE-HTTP-NG-testbed": "HTTP-NG-testbed",
    "NOTE-WCA": "WCA",
    "NOTE-html40-mobile": "html40-mobile",
    "NOTE-rdf-uml": "rdf-uml",
    "NOTE-xlink-req": "xlink-req",
    "WD-DSIG-label-arch": "DSIG-label-arch",
    "WD-HTTP-NG-architecture": "HTTP-NG-architecture",
    "WD-HTTP-NG-interfaces": "HTTP-NG-interfaces",
    "WD-HTTP-NG-wire": "HTTP-NG-wire",
    "WD-P3P-arch": "P3P-arch",
    "WD-P3P-grammar": "P3P-grammar",
    "WD-SVGReq": "SVGReq",
    "WD-XSLReq": "XSLReq",
    "WD-acss": "acss",
    "WD-font": "font",
    "WD-http-pep": "http-pep",
    "WD-ilu-requestor": "ilu-requestor",
    "WD-jepi-uppflow": "jepi-uppflow",
    "WD-mux": "mux",
    "WD-positioning": "positioning",
    "WD-print": "print"
}

function getShortName(url) {
    if (SPECIAL_CASES[url]) return SPECIAL_CASES[url];
    var parts = url.replace(TR_URL, "").split("/").filter(function(p) { return p != "/" && p != ''; });
    if (parts.length > 1) throw new Error("Can't identify shortName from url " + url);
    var part = parts[0]
    return SHORT_NAME_SPECIAL_CASES[part] || part;
}

module.exports = getShortName;