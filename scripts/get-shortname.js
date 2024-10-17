var TR_URL = /https?:\/\/www\.w3\.org\/TR\//;

var SHORT_NAME_SPECIAL_CASES = {
    "WD-DSIG-label-arch": "DSIG-label-arch",
    "WD-HTTP-NG-architecture": "HTTP-NG-architecture",
    "WD-HTTP-NG-goals": "HTTP-NG-goals",
    "WD-HTTP-NG-interfaces": "HTTP-NG-interfaces",
    "WD-HTTP-NG-wire": "HTTP-NG-wire",
    "WD-P3P-arch": "P3P-arch",
    "WD-P3P-grammar": "P3P-grammar",
    "WD-SVGReq": "SVGReq",
    "WD-XSLReq": "XSLReq",
    "WD-acss": "acss",
    "WD-http-pep": "http-pep",
    "WD-ilu-requestor": "ilu-requestor",
    "WD-jepi-uppflow": "jepi-uppflow",
    "WD-mux": "mux",
    "WD-positioning": "positioning",
    "WD-print": "print",
    "REC-DOM-Level-1": "DOM-Level-1",
    "REC-DSig-label": "DSig-label",
    "REC-html32": "HTML32",
    "REC-MathML": "MathML",
    "REC-PICS-labels": "PICS-labels",
    "REC-PICS-services": "PICS-services",
    "REC-PICSRules": "PICSRules",
    "REC-smil": "smil",
    "REC-WebCGM": "WebCGM",
    "WD-logfile": "logfile",
    "WD-mptp": "mptp",
    "WD-proxy": "proxy",
    "WD-rdf-syntax": "rdf-syntax-grammar",
    "WD-session-id": "session-id",
    "WD-sgml-lex": "sgml-lex",
    "WD-wwwicn": "wwwicn"
}

function getShortName(url) {
    var parts = url.replace(TR_URL, "").split("/").filter(function(p) { return p != "/" && p != ''; });
    if (parts.length > 1) throw new Error("Can't identify shortName from url " + url);
    var part = parts[0];
    return SHORT_NAME_SPECIAL_CASES[part] || part;
}

module.exports = getShortName;