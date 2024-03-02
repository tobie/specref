#!/usr/bin/env node
var request = require('request'),
    userAgent =require("./user-agent"),
    bibref = require('../lib/bibref'),
    helper = require('./helper');

var FILENAME = "csswg.json";
var current = helper.readBiblio(FILENAME);

var refs = bibref.expandRefs(bibref.raw);

var CURRENT = {}

Object.keys(refs).forEach(function(id) {
    CURRENT[id.toUpperCase()] = id;
});

var urls = {};

Object.keys(refs).forEach(function(id) {
    var obj = current[id];
    if (typeof obj != "object") return;
    var href = obj.href;
    if (href && !urls[href]) {
        urls[href] = id;
    }
    if (obj.versions) {
        Object.keys(obj.versions).forEach(function (vid) {
            var href = obj.versions[vid].href;
            if (href && !urls[href]) {
                urls[href] = id;
            }
        })
    }
});

var REJECT = {
    "XLINK-20010627/(AVAILABLE": true,
    "HTTP://WWW.W3.ORG/SEARCH/9605-INDEXING-WORKSHOP/REPORTOUTCOMES/S6GROUP2": true,
    "HTTP://WWW.W3.ORG/TR/1999/WAI-WEBCONTENT": true,
    "XHTML11-2e": true,
    "DOM-LEVEL-1-2e": true,
    "XML10-4e": true
}

var REF_URL = "https://drafts.csswg.org/biblio.ref";

console.log("Updating CSS WG refs...");
console.log("Fetching", REF_URL + "...");
request({
    url: REF_URL,
    headers: {
        'User-Agent': userAgent()
    }
}, function(err, response, body) {
    if (err || response.statusCode !== 200) {
        console.log("Can't fetch", REF_URL + ".");
        return;
    }

    console.log("Parsing", REF_URL + "...");
    parse(body).forEach(function(o) {
        var id = CURRENT[o.id] || o.id;
        if (!id || REJECT[id]) return;
        if (refs[id]) {
            if (refs[id].source == REF_URL) {
                current[id] = o;
            }
        } else if (o.href && urls[o.href]) {
            var id = urls[o.href];
            current[o.id] = {
                aliasOf: id
            };
        } else {
            current[o.id] = o;
        }
        delete o.id;
    });
    current = helper.sortRefs(current);
    console.log("updating existing refs.")
    helper.writeBiblio(FILENAME, current);
    helper.tryOverwrite(FILENAME);
});

var MONTHS = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December"
];

function formatDate(str) {
    var d, m, y;
    str.split(" ").forEach(function(s) {
        if (/^\d\d\d\d$/.test(s)) {
            y = s
        } else if (/\d\d?/.test(s)) {
            d = pad(s)
        } else {
            m = pad(MONTHS.indexOf(s) + 1)
        }
    });
    var output = [];
    if (y) {
        output.push(y);
        if (m) {
            output.push(m);
            if (d) {
                output.push(d);
            }
        }
    }
    return output.join("-");
}

function pad(s) {
    s = s+"";
    return s.length === 2 ? s : "0" + s;
}

var STATUSES = {
    'W3C Interest Group Note': 'NOTE',
    'W3C Working Group Note': 'NOTE',
    'W3C Note': 'NOTE',
    'W3C Recommendation': 'REC',
    'W3C Candidate Recommendation': 'CR',
    'W3C Working Draft': 'WD',
    'W3C Editor\'s Draft': 'ED',
    'W3C Proposed Recommendation': 'PR'
};

function parse(str) {
    var output = [], current;
    str.split(/\n/).forEach(function(line) {
        if (/^\s*#/.test(line)) return
        if (/^\s*$/.test(line)) {
            current = {
                source: REF_URL
            }
            output.push(current);
            return;
        }
        var m, type, raw;
        if (m = line.match(/^%([A-Z])\s+(.+)$/)) {
            var type = m[1],
                raw = m[2];
            switch(type) {
                case "U":
                    current.href = raw;
                    break;
                case "T":
                    current.title = raw;
                    break;
                case "D":
                    current.rawDate = formatDate(raw);
                    break;
                case "S":
                    var s = STATUSES[raw];
                    if (s) {
                        current.status = s;
                        current.publisher = "W3C";
                    } else {
                        current.status = raw;
                    }
                    break;
                case "L":
                    current.id = raw;
                    break;
                case "A":
                case "Q":
                    current.authors = current.authors || [];
                    current.authors.push(raw);
                    break;
                case "I":
                    current.publisher = raw;
                    break;
                case "O":
                case "R":
                case "C":
                case "P":
                case "B":
                case "X":
                case "J":
                case "N":
                case "V":
                    break;
                default:
                    throw new Error("Unparseable line: " + line);
            }
        }
    });
    return output;
}



