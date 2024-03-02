#!/usr/bin/env node
var request = require('request'),
    userAgent =require("./user-agent"),
    xml2js = require('xml2js'),
    bibref = require('../lib/bibref'),
    helper = require('./helper'),
    getShortName = require('./get-shortname'),
    leveled = require('./leveled');

var RDF_FILE = "https://www.w3.org/2002/01/tr-automation/tr.rdf";
var FILENAME = "w3c.json";
var current = helper.readBiblio(FILENAME);

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
    "https://www.w3.org/TR/REC-CSS1": "https://www.w3.org/TR/CSS1/",
    "https://www.w3.org/TR/REC-CSS2": "https://www.w3.org/TR/CSS2/",
    "https://www.w3.org/TR/REC-DOM-Level-1": "https://www.w3.org/TR/DOM-Level-1/",
    "https://www.w3.org/TR/REC-DSig-label/": "https://www.w3.org/TR/DSig-label/",
    "https://www.w3.org/TR/REC-MathML": "https://www.w3.org/TR/MathML/",
    "https://www.w3.org/TR/REC-PICS-labels": "https://www.w3.org/TR/PICS-labels/",
    "https://www.w3.org/TR/REC-PICS-services": "https://www.w3.org/TR/PICS-services/",
    "https://www.w3.org/TR/REC-PICSRules": "https://www.w3.org/TR/PICSRules/",
    "https://www.w3.org/TR/REC-WebCGM": "https://www.w3.org/TR/WebCGM/",
    "https://www.w3.org/TR/REC-png": "https://www.w3.org/TR/PNG/",
    "https://www.w3.org/TR/REC-rdf-syntax": "https://www.w3.org/TR/rdf-syntax-grammar/",
    "https://www.w3.org/TR/REC-smil/": "https://www.w3.org/TR/SMIL/",
    "https://www.w3.org/TR/REC-xml-names": "https://www.w3.org/TR/xml-names/",
    "https://www.w3.org/TR/REC-xml": "https://www.w3.org/TR/xml/",
    "https://www.w3.org/TR/xml-events": "https://www.w3.org/TR/xml-events2/",
    "https://www.w3.org/TR/2001/WD-xhtml1-20011004/": "https://www.w3.org/TR/xhtml1/",
};

function convertToHttps(url) {
    if (url) {
        url = url.replace(/^http:\/\/www\.w3\.org/, "https://www.w3.org");
        url = url.replace(/http:\/\/([a-zA-Z0-9_-]+)\.github\.io/, "https://$1.github.io");
    }
    return url;
}

function makeKey(ref) {
    return ref.rawDate.replace(/\-/g, '');
}

function getKey(shortname) {
    return shortname.replace(/^.*?(\d+)$/, "$1");
}

function isLegacyLevel(shortname) {
    return leveled.getLevel(shortname).indexOf("-") < 0;
}

var parser = new xml2js.Parser();
console.log("Updating W3C references...");
request({
    url: RDF_FILE,
    headers: {
        'User-Agent': userAgent()
    }
}, function(err, response, body) {
    if (err || response.statusCode !== 200) {
        console.log("Can't fetch", RDF_FILE + "...");
        return;
    }
    
    console.log("Fetching", RDF_FILE + "...")
    parser.parseString(body, function (err, result) {
        var refs = result['rdf:RDF'];
        var output = [];
        var aliases = {};
        var levels = {};
        var superseders = {};
        
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
                var url = convertToHttps(walk(ref, "$", "rdf:about"));
                var sn = getShortName(TR_URLS[url] || url);
                
                var former = walk(ref, "formerShortname");
                if (former) {
                    url = convertToHttps(walk(ref, "$", "rdf:about"));
                    sn = getShortName(TR_URLS[url] || url);
                    former.forEach(function(item) {
                        if (item == sn) return;
                        if (aliases[item] && aliases[item] !== sn) {
                            console.log("Want to alias [" + item + "] to [" + sn + "] but it's already aliased to [" + aliases[item] + "]." )  ;
                            return;
                        }
                        aliases[item] = sn;
                    });
                    return;
                }
                var supersedes = walk(ref, "supersedes");
                if (supersedes) {
                    url = convertToHttps(walk(ref, "$", "rdf:about"));
                    sn = getShortName(TR_URLS[url] || url);
                    superseders[sn] = supersedes.map(function(item) {
                        var url = convertToHttps(walk(item, "$", "rdf:resource"));
                        return getShortName(TR_URLS[url] || url);
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
            if (leveled.isLevel(k)) {
                k = leveled.getRootShortname(k);
                levels[ref.shortName] = k + "-" + makeKey(ref);
                delete aliases[k];
            }
            var curr = current[k];
            if (curr) {
                for (var prop in ref) {
                    if (typeof ref[prop] !== "undefined") curr[prop] = ref[prop];
                }
                curr.href = curr.trURL;
                delete curr.date;
                delete curr.trURL;
                delete curr.shortName;
                delete curr.aliasOf;
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
            var sN = ref.shortName;
            if (leveled.isLevel(sN)) {
                sN = leveled.getRootShortname(sN);
            }
            var cur = current[sN];
            cur.versions = cur.versions || {};
            var key = makeKey(ref);
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
            try {
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
            } catch(e) {
                var root = current[leveled.getRootShortname(aliasShortname)];
                if (!root || !root.versions || !root.versions[getKey(aliasShortname)]) {
                    if (aliasShortname in bibref.get(aliasShortname)) {
                        return;
                    }
                    throw new Error("Missing data for spec " + aliasShortname);
                }
            }
            current[k] = { aliasOf: leveled.isLevel(aliasShortname) ? leveled.getRootShortname(aliasShortname) : aliasShortname };
        });

        Object.keys(levels).forEach(function(k) {
            current[k] =  { aliasOf: levels[k] };
        });
        
        Object.keys(superseders).forEach(function(id) {
            var obsoletes = superseders[id].filter(function(k) {
                return current[k];
            });
            if (!obsoletes.length) return;
            current[id].obsoletes = obsoletes;
            current[id].obsoletes.forEach(function(k) {
                if (typeof current[k] == "object") {
                    current[k].obsoletedBy = [id];
                }
            });
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
            if (latest && !latest.aliasOf && latest.rawDate !== ref.rawDate) {
                if (latest.title) ref.title = latest.title;
                if (latest.rawDate) ref.rawDate = latest.rawDate;
                if (latest.status) ref.status = latest.status;
                if (latest.publisher) ref.publisher = latest.publisher;
                if (latest.isRetired) ref.isRetired = latest.isRetired;
                if (latest.isSuperseded) ref.isSuperseded = latest.isSuperseded;
            }
        });
        helper.writeBiblio(FILENAME, sorted);
        helper.tryOverwrite(FILENAME);
    });
});

function makeCleaner(status, isRetired, isSuperseded) {
    var AUTHORS_DICTIONARY = {
        "Edward O'Connor": "Theresa O'Connor"
    }
    return function(spec) {
        var authors = walk(spec, "editor");
        authors = authors ? authors.map(function(e) {
            return walk(e, "contact:fullName", 0) || walk(e, "org:name", 0);
        }).map(function(a) {
            return AUTHORS_DICTIONARY[a] || a;
        }) : void 0;
        var type = walk(spec, "rdf:type", 0, "$", "rdf:resource");
        var obj = {
            authors:         authors,
            href:            convertToHttps(walk(spec, "$", "rdf:about").trim()),
            title:           walk(spec, "dc:title", 0),
            rawDate:         walk(spec, "dc:date", 0),
            status:          status,
            publisher:       "W3C",
            isRetired:       isRetired || (type == "https://www.w3.org/2001/02pd/rec54#Retired") || (type == "http://www.w3.org/2001/02pd/rec54#Retired") || void 0,
            isSuperseded:    isSuperseded,
            trURL:           convertToHttps(walk(spec, "doc:versionOf", 0, "$", "rdf:resource")),
            edDraft:         convertToHttps(walk(spec, "ED", 0, "$", "rdf:resource")),
            deliveredBy:     walk(spec, "org:deliveredBy"),
            hasErrata:       convertToHttps(walk(spec, "mat:hasErrata", 0, "$", "rdf:resource")),
            source:          RDF_FILE
        };
        obj.deliveredBy = obj.deliveredBy ? obj.deliveredBy.map(function(r) { return  convertToHttps(walk(r, "contact:homePage", 0, "$", "rdf:resource")); }) : obj.deliveredBy;
        obj.trURL = TR_URLS[obj.trURL] || obj.trURL;
        obj.edDraft = convertToHttps(obj.edDraft);
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
    return ref.source == "https://www.w3.org/2002/01/tr-automation/tr.rdf" || ref.source == "http://www.w3.org/2002/01/tr-automation/tr.rdf" || ref.source == RDF_FILE;
}
