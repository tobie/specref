#!/usr/bin/env node
var request = require('request'),
    userAgent = require("./user-agent"),
    helper = require('./helper'),
    bibref = require('../lib/bibref');

if (process.argv.length != 4) {
  console.log("Usage: fetch-refs.js [url] [publisher]");
  process.exit(1);
}

var SOURCE = process.argv[2];
var PUBLISHER = process.argv[3];
var FILENAME = PUBLISHER.toLowerCase() + ".json";
var HELPER = "./fetch-helpers/" + PUBLISHER.toLowerCase();

var biblio = helper.readBiblio();
var current = helper.readBiblio(FILENAME);
var refs = bibref.createUppercaseRefs(bibref.expandRefs(bibref.raw));
console.log("Updating", PUBLISHER, "references...");
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
        ref = require(HELPER)(ref);
        ref.publisher = PUBLISHER;
        ref.source = SOURCE;
        var uppercaseId = id.toUpperCase();
        var prefixedId = PUBLISHER + "-" + id;
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
    current = helper.sortRefs(current);
    console.log("updating existing refs.")
    helper.writeBiblio(FILENAME, current);
    helper.writeBiblio(biblio);
});
