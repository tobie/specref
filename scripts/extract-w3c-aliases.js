#!/usr/bin/env node
var request = require('request'),
    xml2js = require('xml2js'),
    bibref = require('../lib/bibref'),
    runner = require('./run'),
    getShortName = require('./get-shortname');
    
var RDF_FILE = "http://www.w3.org/2002/01/tr-automation/tr.rdf";
var FILENAME = "w3c.json";
var current = runner.readBiblio(FILENAME);
var oldRefs = runner.readBiblio();

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

function edDraft(url) {
    url = ED_DRAFTS[url] || url;
    return url ? url.replace(/http:\/\/([a-zA-Z0-9_-]+)\.github\.io/, "https://$1.github.io") : url;
}

var parser = new xml2js.Parser();
console.log("Transferring W3C aliases...");
request(RDF_FILE, function(err, response, body) {
    if (err || response.statusCode !== 200) {
        console.log("Can't fetch", RDF_FILE + "...");
        return;
    }
    
    console.log("Fetching", RDF_FILE + "...")
    parser.parseString(body, function (err, result) {
        var refs = result['rdf:RDF'];
        var aliases = {};
        
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
            delete oldRefs[k];
        });
        current = runner.sortRefs(current);
        runner.writeBiblio(FILENAME, current);
        runner.writeBiblio(oldRefs);
    });
});


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

