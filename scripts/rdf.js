var request = require('request'),
    xml2js = require('xml2js'),
    bibref = require('../lib/bibref'),
    runner = require('./run');
    
var current = runner.readBiblio();

var RDF_FILE = "http://www.w3.org/2002/01/tr-automation/tr.rdf";

var STATUSES = {
    'NOTE': 'NOTE',
    'REC': 'REC',
    'CR': 'CR',
    'WD': 'WD',
    'LastCall': 'LCWD',
    'PER': 'PER',
    'PR': 'PR'
};

var parser = new xml2js.Parser();

request(RDF_FILE, function(err, response, body) {
    if (err || response.statusCode !== 200) {
        console.log("Can't fetch", RDF_FILE + "...");
        return;
    }
    
    console.log("Fetching", RDF_FILE + "...")
    parser.parseString(body, function (err, result) {
        var refs = result['rdf:RDF'];
        var output = [];
        
        Object.keys(STATUSES).forEach(function(k) {
            if (refs[k]) {
                var clean = makeCleaner(STATUSES[k]);
                refs[k].forEach(function(ref) {
                    output.push(clean(ref));
                });
            }
        });
        
        var clean;
        if (refs.FirstEdition) {
            clean = makeCleaner(void 0);
            refs.FirstEdition.forEach(function(ref) {
                output.push(clean(ref));
            });
        }

        if (refs.Retired) {
            clean = makeCleaner(void 0, true);
            refs.Retired.forEach(function(ref) {
                output.push(clean(ref));
            });
        }

        if (refs.Superseded) {
            clean = makeCleaner(void 0, void 0, true);
            refs.Superseded.forEach(function(ref) {
                output.push(clean(ref));
            });
        }

        // Fill in missing specs
        output.forEach(function(ref) {
            var k = ref.shortName;
            if (k in current) {
                if (isGeneratedByThisScript(ref)) {
                    current[k].deliveredBy = ref.deliveredBy;
                    current[k].hasErrata = ref.hasErrata;
                }
            } else {
                var clone = _cloneJSON(ref);
                clone.href = clone.trURL;
                delete clone.trURL;
                delete clone.shortName;
                if (clone.authors > 1) clone.unorderedAuthors = true;
                current[k] = clone;
            }
        });
        
        // Fill in missing previous versions
        output.forEach(function(ref) {
            var cur = current[ref.shortName];
            cur.versions = cur.versions || {};
            var key = ref.rawDate.replace(/\-/g, '');
            var prev = cur.versions[key];
            if (prev) {
                if (isGeneratedByThisScript(prev)) {
                    prev.rawDate = ref.rawDate;
                    delete prev.date;
                    prev.deliveredBy = ref.deliveredBy;
                    prev.hasErrata = ref.hasErrata;
                }
            } else {
                var clone = _cloneJSON(ref);
                delete clone.trURL;
                clone.isRetired;
                clone.isSuperseded;
                delete clone.shortName;
                if (areAuthorsEqual(ref.authors, cur.authors)) {
                    clone.authors = _cloneJSON(cur.authors)
                    clone.etAl = cur.etAl;
                } else {
                    if (clone.authors.length > 1) clone.unorderedAuthors = true;
                }
                cur.versions[key] = clone;
            }
        });
        console.log("Sorting references...");
        var sorted = {}, needUpdate = [];
        Object.keys(current).sort().forEach(function(k) {
            var ref = current[k];
            sorted[k] = current[k];
            delete ref.shortName;
            if (isGeneratedByThisScript(ref)) {
                needUpdate.push(ref)
            }
        });

        console.log("updating existing refs.")
        needUpdate.forEach(function(ref) {
            var latest = bibref.findLatest(ref);
            if (latest.rawDate !== ref.rawDate) {
                ref.title = latest.title;
                ref.rawDate = latest.rawDate;
                ref.status = latest.status;
                ref.publisher = latest.publisher;
                ref.isRetired = latest.isRetired;
                ref.isSuperseded = latest.isSuperseded;
            }
        });

        // Deal with CSS dups
        sorted.CSS2 = { aliasOf: "CSS21" };
        runner.writeBiblio(sorted);
    });
});

function makeCleaner(status, isRetired, isSuperseded) {
    return function(spec) {
        var authors = walk(spec, "editor");
        authors = authors ? authors.map(function(e) {
            return walk(e, "contact:fullName", 0) || walk(e, "org:name", 0);
        }) : void 0;
        var obj = {
            authors:         authors,
            href:            walk(spec, "$", "rdf:about"),
            title:           walk(spec, "dc:title", 0),
            rawDate:         walk(spec, "dc:date", 0),
            status:          status,
            publisher:       "W3C",
            isRetired:       isRetired,
            isSuperseded:    isSuperseded,
            trURL:           walk(spec, "doc:versionOf", 0, "$", "rdf:resource"),
            deliveredBy:     walk(spec, "org:deliveredBy", 0, "contact:homePage", 0, "$", "rdf:resource"),
            hasErrata:       walk(spec, "mat:hasErrata", 0, "$", "rdf:resource"),
            source:          RDF_FILE
        };
        obj.trURL = TR_URLS[obj.trURL] || obj.trURL;
        obj.shortName = getShortName(obj.trURL);
        return obj;
    }
}

function walk(obj) {
    for (var i=1; i < arguments.length; i++) {
        var prop = arguments[i]
        if (prop in obj) {
            obj = obj[prop];
        } else {
            return void 0;
        }
    }
    return obj;
}


function _cloneJSON(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function areAuthorsEqual(a, b) {
    return _cloneJSON(a||[]).sort().join(',') === _cloneJSON(b||[]).sort().join(',')
}

function isGeneratedByThisScript(ref) {
    return ref.source == "http://www.w3.org/2002/01/tr-automation/tr.rdf" || ref.source == RDF_FILE;
}


var TR_URLS = {
    "http://www.w3.org/TR/REC-CSS1": "http://www.w3.org/TR/CSS1/",
    "http://www.w3.org/TR/REC-DOM-Level-1": "http://www.w3.org/TR/DOM-Level-1/",
    "http://www.w3.org/TR/REC-DSig-label/": "http://www.w3.org/TR/DSig-label/",
    "http://www.w3.org/TR/REC-MathML": "http://www.w3.org/TR/MathML/",
    "http://www.w3.org/TR/REC-PICS-labels": "http://www.w3.org/TR/PICS-labels/",
    "http://www.w3.org/TR/REC-PICS-services": "http://www.w3.org/TR/PICS-services/",
    "http://www.w3.org/TR/REC-PICSRules": "http://www.w3.org/TR/PICSRules/",
    "http://www.w3.org/TR/REC-WebCGM": "http://www.w3.org/TR/WebCGM/",
    "http://www.w3.org/TR/REC-png": "http://www.w3.org/TR/PNG/",
    "http://www.w3.org/TR/REC-rdf-syntax": "http://www.w3.org/TR/rdf-syntax-grammar/",
    "http://www.w3.org/TR/REC-smil/": "http://www.w3.org/TR/SMIL/",
    "http://www.w3.org/TR/REC-xml-names": "http://www.w3.org/TR/xml-names/",
    "http://www.w3.org/TR/REC-xml": "http://www.w3.org/TR/xml/"
};

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

