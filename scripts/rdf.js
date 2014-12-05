#!/usr/bin/env node
var request = require('request'),
    xml2js = require('xml2js'),
    bibref = require('../lib/bibref'),
    runner = require('./run'),
    getShortName = require('./get-shortname');
    
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

var TR_URLS = {
    "http://www.w3.org/TR/REC-CSS1": "http://www.w3.org/TR/CSS1/",
    "http://www.w3.org/TR/REC-CSS2": "http://www.w3.org/TR/CSS2/",
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
    "http://www.w3.org/TR/REC-xml": "http://www.w3.org/TR/xml/",
    "http://www.w3.org/TR/xml-events": "http://www.w3.org/TR/xml-events2/",
    "http://www.w3.org/TR/2001/WD-xhtml1-20011004/": "http://www.w3.org/TR/xhtml1/",
};

var ED_DRAFTS = {
    "http://dev.w3.org/2006/webapi/WebIDL/": "http://heycam.github.io/webidl/"
};


var parser = new xml2js.Parser();
console.log("Updating W3C references...");
request(RDF_FILE, function(err, response, body) {
    if (err || response.statusCode !== 200) {
        console.log("Can't fetch", RDF_FILE + "...");
        return;
    }
    
    console.log("Fetching", RDF_FILE + "...")
    parser.parseString(body, function (err, result) {
        var refs = result['rdf:RDF'];
        var output = [];
        var aliases = {};
        
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
        
        if (refs["rdf:Description"]) {
            refs["rdf:Description"].forEach(function(ref) {
                var former = walk(ref, "formerShortname");
                var url = walk(ref, "$", "rdf:about");
                var sn = getShortName(TR_URLS[url] || url);
                if (former) {
                    former.forEach(function(item) {
                        if (item == sn) return;
                        if (aliases[item] && aliases[item] !== sn) {
                            console.log("Want to alias [" + item + "] to [" + sn + "] but it's already aliased to [" + aliases[item] + "]." )  ;
                            return;
                        }
                        aliases[item] = sn;
                    });
                }
            });
        }
        
        function isCircular(k) {
            var keys = { k: true };
            while (k in aliases) {
                if (k in keys) return true;
                k = aliases[k];
                keys[k] = true;
            }
            return false;
        }
        
        var circular = [];
        Object.keys(aliases).forEach(function(k) {
            if (isCircular(k)) {
                console.log(k, "=>", aliases[k]);
                circular.push(k)
            }
        });
        
        Object.keys(aliases).forEach(function(k) {
            if (circular.indexOf(k) >= 0 || circular.indexOf(aliases[k]) >= 0) {
                delete aliases[k];
            }
        });
        
        // Fill in missing specs
        output.forEach(function(ref) {
            var k = ref.shortName;
            var curr = current[k];
            if (curr) {
                for (var prop in ref) {
                    if (typeof ref[prop] !== "undefined") curr[prop] = ref[prop];
                }
                curr.href = curr.trURL;
                delete curr.date;
                delete curr.trURL;
                delete curr.shortName;
            } else {
                var clone = _cloneJSON(ref);
                clone.href = clone.trURL;
                delete clone.trURL;
                delete clone.shortName;
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
                if (prev.aliasOf) {
                    return;
                }
                for (var prop in ref) {
                    if (typeof ref[prop] !== "undefined") prev[prop] = ref[prop];
                }
                delete prev.date;
                delete prev.trURL;
                delete prev.shortName;
                delete prev.edDraft;
                delete prev.unorderedAuthors
            } else {
                var clone = _cloneJSON(ref);
                delete clone.trURL;
                delete clone.shortName;
                delete clone.edDraft;
                cur.versions[key] = clone;
            }
        });
        
        Object.keys(aliases).forEach(function(k) {
            var aliasShortname = aliases[k];
            var alias = current[aliasShortname];
            if (!alias) throw new Error("Missing data for spec " + aliasShortname);
            var obj = { aliasOf: aliasShortname };
            while (alias.aliasOf) {
                aliasShortname = alias.aliasOf;
                alias = current[aliasShortname];
            }
            var old = current[k];
            if (old && old.versions) {
                alias.versions = alias.versions || {};
                for (var prop in old.versions) {
                    if (!alias.versions[prop]) {
                        alias.versions[prop] = old.versions[prop];
                    }
                }
            }
            current[k] = { aliasOf: aliasShortname };
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
            if (!latest.aliasOf && latest.rawDate !== ref.rawDate) {
                if (latest.title) ref.title = latest.title;
                if (latest.rawDate) ref.rawDate = latest.rawDate;
                if (latest.status) ref.status = latest.status;
                if (latest.publisher) ref.publisher = latest.publisher;
                if (latest.isRetired) ref.isRetired = latest.isRetired;
                if (latest.isSuperseded) ref.isSuperseded = latest.isSuperseded;
            }
        });
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
            edDraft:         walk(spec, "ED", 0, "$", "rdf:resource"),
            deliveredBy:     walk(spec, "org:deliveredBy"),
            hasErrata:       walk(spec, "mat:hasErrata", 0, "$", "rdf:resource"),
            source:          RDF_FILE
        };
        obj.deliveredBy = obj.deliveredBy ? obj.deliveredBy.map(function(r) { return  walk(r, "contact:homePage", 0, "$", "rdf:resource"); }) : obj.deliveredBy;
        obj.trURL = TR_URLS[obj.trURL] || obj.trURL;
        obj.edDraft = ED_DRAFTS[obj.edDraft] || obj.edDraft;
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

function isGeneratedByThisScript(ref) {
    return ref.source == "http://www.w3.org/2002/01/tr-automation/tr.rdf" || ref.source == RDF_FILE;
}
