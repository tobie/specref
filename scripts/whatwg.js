#!/usr/bin/env node
var request = require('request'),
    runner = require('./run'),
    bibref = require('../lib/bibref');

var SOURCE = "https://resources.whatwg.org/biblio.json";
var FILENAME = "whatwg.json";

var biblio = runner.readBiblio();
var current = runner.readBiblio(FILENAME);
var refs = bibref.createUppercaseRefs(bibref.expandRefs(bibref.raw));
console.log("Updating WHATWG references...");
console.log("Fetching", SOURCE + "...");
request(SOURCE, function(err, response, body) {
    if (err || response.statusCode !== 200) {
        console.log("Can't fetch", SOURCE + ".");
        return;
    }
    
    console.log("Parsing", SOURCE + "...");
    var json = JSON.parse(body);
    Object.keys(json).forEach(function(k) {
        var ref = json[k];
        ref = {
            authors: ref.authors,
            href: ref.href,
            title: ref.title,
            obsoletedBy: ref.obsoletedBy,
            publisher: "WHATWG",
            status: "Living Standard",
            source: SOURCE
        };
        var ucK = k.toUpperCase()
        if (!(ucK in refs)) {
            current[k] = ref;
            current["WHATWG-" + k] = { aliasOf: k };
        } else {
            var existingRef  = refs[ucK];
            while (existingRef.aliasOf) { existingRef = refs[existingRef.aliasOf]; }
            if (existingRef.source == SOURCE ||
                    bibref.normalizeUrl(ref.href) ==  bibref.normalizeUrl(existingRef.href)) {
                current[k] = ref;
                current["WHATWG-" + k] = { aliasOf: k };
            } else {
                current["WHATWG-" + k] = ref;
            }
        }
        var rv = bibref.reverseLookup([ref.href])[ref.href];
        if (rv && rv.id.toUpperCase() != ucK &&
                // avoid inadvertently catching drafts.
                bibref.normalizeUrl(rv.href) == bibref.normalizeUrl(ref.href)) {
            current[rv.id] = { aliasOf: "WHATWG-" + k };
            delete biblio[rv.id];
        }
    });
    current = runner.sortRefs(current);
    console.log("updating existing refs.")
    runner.writeBiblio(FILENAME, current);
    runner.writeBiblio(biblio);
});
