#!/usr/bin/env node
var request = require('request'),
    userAgent =require("./user-agent"),
    runner = require('./run'),
    bibref = require('../lib/bibref');

var SOURCE = "https://resources.whatwg.org/biblio.json";
var FILENAME = "whatwg.json";

var biblio = runner.readBiblio();
var current = runner.readBiblio(FILENAME);
var refs = bibref.createUppercaseRefs(bibref.expandRefs(bibref.raw));
console.log("Updating WHATWG references...");
console.log("Fetching", SOURCE + "...");
request({
    url: SOURCE,
    headers: {
        'User-Agent': userAgent()
    }
}, function(err, response, body) {
    if (err || response.statusCode !== 200) {
        console.log("Can't fetch", SOURCE + ".");
        return;
    }
    
    console.log("Parsing", SOURCE + "...");
    var json = JSON.parse(body);
    Object.keys(json).forEach(function(id) {
        var ref = json[id];
        ref = {
            authors: ref.authors,
            href: ref.href,
            title: ref.title,
            obsoletedBy: ref.obsoletedBy,
            publisher: "WHATWG",
            status: "Living Standard",
            source: SOURCE
        };
        var uppercaseId = id.toUpperCase();
        var prefixedId = "WHATWG-" + id;
        if (!(uppercaseId in refs)) {
            current[id] = ref;
            current[prefixedId] = { aliasOf: id };
        } else {
            var existingRef = refs[uppercaseId];
            while (existingRef.aliasOf) { existingRef = refs[existingRef.aliasOf]; }
            if (existingRef.source == SOURCE ||
                    bibref.normalizeUrl(ref.href) == bibref.normalizeUrl(existingRef.href)) {
                current[id] = ref;
                current[prefixedId] = { aliasOf: id };
            } else {
                current[prefixedId] = ref;
            }
        }
        var rv = bibref.reverseLookup([ref.href])[ref.href];
        if (rv && rv.id.toUpperCase() != uppercaseId &&
                rv.id.toUpperCase() != prefixedId.toUpperCase() &&
                // avoid inadvertently catching drafts.
                bibref.normalizeUrl(rv.href) == bibref.normalizeUrl(ref.href)) {
            current[rv.id] = { aliasOf: prefixedId };
            delete biblio[rv.id];
        }
    });
    current = runner.sortRefs(current);
    console.log("updating existing refs.")
    runner.writeBiblio(FILENAME, current);
    runner.writeBiblio(biblio);
});
