#!/usr/bin/env node
var request = require('request'),
    userAgent = require("./user-agent"),
    helper = require('./helper'),
    bibref = require('../lib/bibref');

var SOURCE = 'https://raw.githubusercontent.com/w3c/browser-specs/web-specs%40latest/index.json';
var PUBLISHER = 'browser-specs';
var FILENAME = PUBLISHER.toLowerCase() + ".json";

var biblio = helper.readBiblio();
var current = helper.readBiblio(FILENAME);
var updatedList = {};
var refs = bibref.createUppercaseRefs(bibref.expandRefs(bibref.raw));

function convertSpec(spec) {
    const ref = {
        href: spec.url,
        title: spec.title,
        status: spec.nightly.status,
        publisher: spec.organization,
        deliveredBy: spec.groups.map(function(group) {
            // Specref does not like fragment IDs in group URLs
            // (not a big deal, that would only potentially be useful for
            // FIDO Alliance groups)
            return group.url.replace(/#.*$/, '');
        }),
        source: SOURCE
    };
    if (spec.nightly.repository) {
        ref.repository = spec.nightly.repository;
    }
    return ref;
}


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
    JSON.parse(body)
        .filter(function(spec) {
            // Only keep specs from browser-specs for which the info came from
            // the spec itself (other specs should already be in Specref)
            const uppercaseId = spec.shortname.toUpperCase();
            return spec.source === 'spec';
        })
        .forEach(function(spec) {
            ref = convertSpec(spec);
            
            var id = spec.shortname;
            var uppercaseId = id.toUpperCase();

            // Spec may already exist in Specref under another name
            var rv = bibref.reverseLookup([ref.href])[ref.href];
            if (rv) {
                if (current[uppercaseId] &&
                        rv.id.toUpperCase() != uppercaseId &&
                        // avoid inadvertently catching drafts.
                        bibref.normalizeUrl(rv.href) == bibref.normalizeUrl(ref.href)) {
                    // Make the existing entry in browser-specs.json an alias
                    // of the other one
                    updatedList[uppercaseId] = { aliasOf: rv.id };
                    return;
                }
                else if (!current[uppercaseId]) {
                    // Entry did not exist in browser-specs.json, let's not
                    // create one
                    return;
                }
            }

            if (!(uppercaseId in refs)) {
                updatedList[uppercaseId] = ref;
            } else {
                var existingRef = refs[uppercaseId];
                while (existingRef.aliasOf) { existingRef = refs[existingRef.aliasOf]; }
                if (!("source" in existingRef) || existingRef.source == SOURCE ||
                        bibref.normalizeUrl(ref.href) == bibref.normalizeUrl(existingRef.href)) {
                    updatedList[uppercaseId] = ref;
                } else {
                    throw new Error("cannot override " + uppercaseId);
                }
            }
        });
    // For continuity, add back aliases that we may have created earlier on,
    // unless the targeted entry no longer exists
    Object.keys(current).forEach(function(id) {
        var ref = current[id];
        if (!updatedList[id] && ref.aliasOf && refs[ref.aliasOf]) {
            updatedList[id] = ref;
        }
    });
    updatedList = helper.sortRefs(updatedList);
    console.log("updating existing refs.")
    helper.writeBiblio(FILENAME, updatedList);
    helper.tryOverwrite(FILENAME);
    helper.writeBiblio(biblio);
});
